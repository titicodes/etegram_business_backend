import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Deliveries, DeliveriesDocument } from './schema/deliveries.schema';
import { UserDocument } from '../user/schema/user.schema';
import { Product, ProductDocument } from '../product/schema/product.schema';
import { UserRoleEnum } from '../../common/enums/user.enum';
import { CreateDeliveryDto } from './dto/delivery.dto';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';
import {
  DeliveryTransaction,
  DeliveryTransactionDocument,
} from './schema/delivery-transaction.schema';
import { CreateDeliveryTransactionDto } from './dto/create_delivery-transaction.dto';
import { Store, StoreDocument } from '../store/schema/store.schema';

@Injectable()
export class DeliveriesService {
  private readonly logger = new Logger(DeliveriesService.name);

  constructor(
    @InjectModel(Deliveries.name)
    private readonly deliveriesModel: Model<DeliveriesDocument>,
    @InjectModel(DeliveryTransaction.name)
    private readonly deliveryTransactionModel: Model<DeliveryTransactionDocument>,
    @InjectModel(Store.name) private readonly storeModel: Model<StoreDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  async createDeliveryAgent(
    dto: CreateDeliveryDto,
    user: UserDocument,
  ): Promise<{ success: boolean; data: Deliveries; message: string }> {
    this.logger.log(
      `Creating delivery agent for user=${user._id}, store=${dto.storeId}`,
    );

    if (!Types.ObjectId.isValid(dto.storeId)) {
      throw new BadRequestException('Invalid store ID');
    }

    const store = await this.validateStoreAccess(
      dto.storeId,
      user._id.toString(),
      user.role,
    );
    if (!store) {
      throw new BadRequestException(
        'Store not found or you do not have permission',
      );
    }

    const session = await this.deliveriesModel.db.startSession();
    try {
      const result = await session.withTransaction(async () => {
        const existingDelivery = await this.deliveriesModel
          .findOne({ email: dto.email, user: user._id, store: dto.storeId })
          .session(session)
          .exec();
        if (existingDelivery) {
          throw new ConflictException(
            `Delivery agent with email ${dto.email} already exists in this store`,
          );
        }

        const [newDelivery] = await this.deliveriesModel.create(
          [
            {
              ...dto,
              user: user._id,
              store: dto.storeId,
              status: 'ACTIVE',
              createdAt: new Date(),
            },
          ],
          { session },
        );

        return newDelivery;
      });

      const fullDelivery = await this.deliveriesModel
        .findById(result._id)
        .lean()
        .exec();
      return {
        success: true,
        data: fullDelivery,
        message: 'Delivery agent created successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to create delivery agent: ${error.message}`,
        error.stack,
      );
      throw error instanceof ConflictException ||
        error instanceof NotFoundException
        ? error
        : new InternalServerErrorException('Failed to create delivery agent');
    } finally {
      session.endSession();
    }
  }

  async createDeliveryTransaction(
    dto: CreateDeliveryTransactionDto,
    user: UserDocument,
  ): Promise<{ success: boolean; data: DeliveryTransaction; message: string }> {
    this.logger.log(
      `Creating delivery transaction for user=${user._id}, store=${dto.storeId}`,
    );

    if (!Types.ObjectId.isValid(dto.storeId)) {
      throw new BadRequestException('Invalid store ID');
    }

    const store = await this.validateStoreAccess(
      dto.storeId,
      user._id.toString(),
      user.role,
    );
    if (!store) {
      throw new BadRequestException(
        'Store not found or you do not have permission',
      );
    }

    const session = await this.deliveryTransactionModel.db.startSession();
    try {
      const result = await session.withTransaction(async () => {
        const existingTransaction = await this.deliveryTransactionModel
          .findOne({ orderId: dto.orderId, user: user._id, store: dto.storeId })
          .session(session)
          .exec();
        if (existingTransaction) {
          throw new ConflictException(
            `Transaction for order ${dto.orderId} already exists in this store`,
          );
        }

        for (const item of dto.items) {
          const product = await this.productModel
            .findOne({
              code: item.productCode,
              createdBy: user._id,
              store: dto.storeId,
            })
            .session(session)
            .exec();
          if (!product) {
            throw new NotFoundException(
              `Product with code ${item.productCode} not found in store ${dto.storeId}`,
            );
          }
          if (dto.status === 'DELIVERED' && product.quantity < item.quantity) {
            throw new BadRequestException(
              `Insufficient stock for product ${item.productCode}`,
            );
          }
          if (dto.status === 'DELIVERED') {
            product.quantity -= item.quantity;
          } else if (dto.status === 'RECEIVED') {
            product.quantity += item.quantity;
          }
          await product.save({ session });
        }

        const [newTransaction] = await this.deliveryTransactionModel.create(
          [
            {
              ...dto,
              user: user._id,
              store: dto.storeId,
              status: dto.status || 'PENDING',
              createdAt: new Date(),
            },
          ],
          { session },
        );

        return newTransaction;
      });

      const fullTransaction = await this.deliveryTransactionModel
        .findById(result._id)
        .lean()
        .exec();
      return {
        success: true,
        data: fullTransaction,
        message: 'Delivery transaction created successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to create delivery transaction: ${error.message}`,
        error.stack,
      );
      throw error instanceof ConflictException ||
        error instanceof NotFoundException
        ? error
        : new InternalServerErrorException(
            'Failed to create delivery transaction',
          );
    } finally {
      session.endSession();
    }
  }

  async findAllDeliveryAgents(
    user: UserDocument,
    storeId?: string,
  ): Promise<Deliveries[]> {
    this.logger.log(
      `Fetching delivery agents for user=${user._id}, store=${storeId || 'all'}`,
    );

    const query: any = { user: user._id };
    if (storeId) {
      if (!Types.ObjectId.isValid(storeId)) {
        throw new BadRequestException('Invalid store ID');
      }
      const store = await this.validateStoreAccess(
        storeId,
        user._id.toString(),
        user.role,
      );
      if (!store) {
        throw new BadRequestException(
          'Store not found or you do not have permission',
        );
      }
      query.store = storeId;
    }

    try {
      const deliveries = await this.deliveriesModel.find(query).exec();
      this.logger.log(`Fetched ${deliveries.length} delivery agents`);
      return deliveries;
    } catch (error) {
      this.logger.error(
        `Failed to fetch delivery agents: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to fetch delivery agents');
    }
  }

  async findAllDeliveryTransactions(
    user: UserDocument,
    storeId?: string,
  ): Promise<DeliveryTransaction[]> {
    this.logger.log(
      `Fetching delivery transactions for user=${user._id}, store=${storeId || 'all'}`,
    );

    const query: any = { user: user._id };
    if (storeId) {
      if (!Types.ObjectId.isValid(storeId)) {
        throw new BadRequestException('Invalid store ID');
      }
      const store = await this.validateStoreAccess(
        storeId,
        user._id.toString(),
        user.role,
      );
      if (!store) {
        throw new BadRequestException(
          'Store not found or you do not have permission',
        );
      }
      query.store = storeId;
    }

    try {
      const transactions = await this.deliveryTransactionModel
        .find(query)
        .exec();
      this.logger.log(`Fetched ${transactions.length} delivery transactions`);
      return transactions;
    } catch (error) {
      this.logger.error(
        `Failed to fetch delivery transactions: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to fetch delivery transactions',
      );
    }
  }

  async findDeliveryAgentById(
    id: string,
    user: UserDocument,
  ): Promise<Deliveries> {
    this.logger.log(`Fetching delivery agent id=${id} for user=${user._id}`);

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid delivery agent ID');
    }

    try {
      const delivery = await this.deliveriesModel
        .findOne({ _id: id, user: user._id })
        .exec();
      if (!delivery) {
        throw new NotFoundException(`Delivery agent with ID ${id} not found`);
      }
      this.logger.log(`Fetched delivery agent id=${id}`);
      return delivery;
    } catch (error) {
      this.logger.error(
        `Failed to fetch delivery agent id=${id}: ${error.message}`,
        error.stack,
      );
      throw error instanceof NotFoundException
        ? error
        : new InternalServerErrorException(
            `Failed to fetch delivery agent with ID ${id}`,
          );
    }
  }

  async findDeliveryTransactionById(
    id: string,
    user: UserDocument,
  ): Promise<DeliveryTransaction> {
    this.logger.log(
      `Fetching delivery transaction id=${id} for user=${user._id}`,
    );

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid delivery transaction ID');
    }

    try {
      const transaction = await this.deliveryTransactionModel
        .findOne({ _id: id, user: user._id })
        .exec();
      if (!transaction) {
        throw new NotFoundException(
          `Delivery transaction with ID ${id} not found`,
        );
      }
      this.logger.log(`Fetched delivery transaction id=${id}`);
      return transaction;
    } catch (error) {
      this.logger.error(
        `Failed to fetch delivery transaction id=${id}: ${error.message}`,
        error.stack,
      );
      throw error instanceof NotFoundException
        ? error
        : new InternalServerErrorException(
            `Failed to fetch delivery transaction with ID ${id}`,
          );
    }
  }

  async updateDeliveryAgent(
    id: string,
    dto: UpdateDeliveryDto,
    user: UserDocument,
  ): Promise<Deliveries> {
    this.logger.log(`Updating delivery agent id=${id} for user=${user._id}`);

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid delivery agent ID');
    }

    const delivery = await this.deliveriesModel
      .findOne({ _id: id, user: user._id })
      .exec();
    if (!delivery) {
      throw new NotFoundException(`Delivery agent with ID ${id} not found`);
    }

    if (dto.storeId && dto.storeId !== delivery.store.toString()) {
      const store = await this.validateStoreAccess(
        dto.storeId,
        user._id.toString(),
        user.role,
      );
      if (!store) {
        throw new BadRequestException(
          'Store not found or you do not have permission',
        );
      }
    }

    try {
      const updatedDelivery = await this.deliveriesModel
        .findOneAndUpdate(
          { _id: id, user: user._id },
          { ...dto, updatedAt: new Date() },
          { new: true },
        )
        .exec();
      if (!updatedDelivery) {
        throw new NotFoundException(`Delivery agent with ID ${id} not found`);
      }
      this.logger.log(`Updated delivery agent id=${id}`);
      return updatedDelivery;
    } catch (error) {
      this.logger.error(
        `Failed to update delivery agent id=${id}: ${error.message}`,
        error.stack,
      );
      throw error instanceof NotFoundException
        ? error
        : new InternalServerErrorException(
            `Failed to update delivery agent with ID ${id}`,
          );
    }
  }

  async deleteDeliveryAgent(
    id: string,
    user: UserDocument,
  ): Promise<{ deleted: boolean }> {
    this.logger.log(`Deleting delivery agent id=${id} for user=${user._id}`);

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid delivery agent ID');
    }

    try {
      const result = await this.deliveriesModel
        .deleteOne({ _id: id, user: user._id })
        .exec();
      if (result.deletedCount === 0) {
        throw new NotFoundException(`Delivery agent with ID ${id} not found`);
      }
      this.logger.log(`Deleted delivery agent id=${id}`);
      return { deleted: true };
    } catch (error) {
      this.logger.error(
        `Failed to delete delivery agent id=${id}: ${error.message}`,
        error.stack,
      );
      throw error instanceof NotFoundException
        ? error
        : new InternalServerErrorException(
            `Failed to delete delivery agent with ID ${id}`,
          );
    }
  }

  private async validateStoreAccess(
    storeId: string,
    userId: string,
    userRole: UserRoleEnum[],
  ): Promise<StoreDocument | null> {
    let store;

    if (userRole.includes(UserRoleEnum.ADMIN)) {
      store = await this.storeModel.findById(storeId).exec();
    } else {
      store = await this.storeModel
        .findOne({ _id: storeId, owner: userId })
        .exec();
    }

    return store;
  }
}
