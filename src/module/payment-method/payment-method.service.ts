import { BadRequestException, Injectable, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PaymentMethod, PaymentMethodDocument } from './schema/payment-method.schema';
import { CreatePaymentMethodDto, UpdatePaymentMethodDto } from './dto/payment-method.dto';
import { User, UserDocument } from '../user/schema/user.schema';
import { UserRoleEnum } from '../../common/enums/user.enum';

@Injectable()
export class PaymentMethodService {
  private readonly logger = new Logger(PaymentMethodService.name);

  constructor(
    @InjectModel(PaymentMethod.name) private readonly paymentMethodModel: Model<PaymentMethodDocument>,
  ) {}

  async create(createDto: CreatePaymentMethodDto, user: UserDocument): Promise<PaymentMethod> {
    this.logger.log(`Creating payment method for user=${user._id}, store=${createDto.storeId}`);

    if (!Types.ObjectId.isValid(createDto.storeId)) {
      throw new BadRequestException('Invalid store ID');
    }

    const store = await this.validateStoreAccess(createDto.storeId, user._id.toString(), user.role);
    if (!store) {
      throw new BadRequestException('Store not found or you do not have permission');
    }

    try {
      const [createdPaymentMethod] = await this.paymentMethodModel.create([
        {
          ...createDto,
          user: user._id,
          store: createDto.storeId,
          createdAt: new Date(),
        },
      ]);
      this.logger.log(`Created payment method id=${createdPaymentMethod._id}`);
      return createdPaymentMethod;
    } catch (error) {
      this.logger.error(`Failed to create payment method: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to create payment method');
    }
  }

  async findAll(user: UserDocument, storeId?: string): Promise<PaymentMethod[]> {
    this.logger.log(`Fetching payment methods for user=${user._id}, store=${storeId || 'all'}`);

    const query: any = { user: user._id };
    if (storeId) {
      if (!Types.ObjectId.isValid(storeId)) {
        throw new BadRequestException('Invalid store ID');
      }
      const store = await this.validateStoreAccess(storeId, user._id.toString(), user.role);
      if (!store) {
        throw new BadRequestException('Store not found or you do not have permission');
      }
      query.store = storeId;
    }

    try {
      const paymentMethods = await this.paymentMethodModel.find(query).exec();
      this.logger.log(`Found ${paymentMethods.length} payment methods`);
      return paymentMethods;
    } catch (error) {
      this.logger.error(`Failed to fetch payment methods: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to fetch payment methods');
    }
  }

  async findOne(id: string, user: UserDocument): Promise<PaymentMethod> {
    this.logger.log(`Fetching payment method id=${id} for user=${user._id}`);

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid payment method ID');
    }

    try {
      const paymentMethod = await this.paymentMethodModel.findOne({ _id: id, user: user._id }).exec();
      if (!paymentMethod) {
        throw new NotFoundException(`Payment method with ID ${id} not found`);
      }
      this.logger.log(`Found payment method id=${id}`);
      return paymentMethod;
    } catch (error) {
      this.logger.error(`Failed to fetch payment method id=${id}: ${error.message}`, error.stack);
      throw error instanceof NotFoundException
        ? error
        : new InternalServerErrorException(`Failed to fetch payment method with ID ${id}`);
    }
  }

  async update(id: string, updateDto: UpdatePaymentMethodDto, user: UserDocument): Promise<PaymentMethod> {
    this.logger.log(`Updating payment method id=${id} for user=${user._id}`);

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid payment method ID');
    }

    const paymentMethod = await this.paymentMethodModel.findOne({ _id: id, user: user._id }).exec();
    if (!paymentMethod) {
      throw new NotFoundException(`Payment method with ID ${id} not found`);
    }

    if (updateDto.storeId && updateDto.storeId !== paymentMethod.store.toString()) {
      const store = await this.validateStoreAccess(updateDto.storeId, user._id.toString(), user.role);
      if (!store) {
        throw new BadRequestException('Store not found or you do not have permission');
      }
    }

    try {
      const updatedPaymentMethod = await this.paymentMethodModel
        .findOneAndUpdate({ _id: id, user: user._id }, { ...updateDto, updatedAt: new Date() }, { new: true })
        .exec();
      if (!updatedPaymentMethod) {
        throw new NotFoundException(`Payment method with ID ${id} not found`);
      }
      this.logger.log(`Updated payment method id=${id}`);
      return updatedPaymentMethod;
    } catch (error) {
      this.logger.error(`Failed to update payment method id=${id}: ${error.message}`, error.stack);
      throw error instanceof NotFoundException
        ? error
        : new InternalServerErrorException(`Failed to update payment method with ID ${id}`);
    }
  }

  async remove(id: string, user: UserDocument): Promise<void> {
    this.logger.log(`Deleting payment method id=${id} for user=${user._id}`);

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid payment method ID');
    }

    try {
      const result = await this.paymentMethodModel.findOneAndDelete({ _id: id, user: user._id }).exec();
      if (!result) {
        throw new NotFoundException(`Payment method with ID ${id} not found`);
      }
      this.logger.log(`Deleted payment method id=${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete payment method id=${id}: ${error.message}`, error.stack);
      throw error instanceof NotFoundException
        ? error
        : new InternalServerErrorException(`Failed to delete payment method with ID ${id}`);
    }
  }

  private async validateStoreAccess(storeId: string, userId: string, userRole: UserRoleEnum[]): Promise<any> {
    const storeModel = this.paymentMethodModel.db.model('Store');
    let store;

    if (userRole.includes(UserRoleEnum.ADMIN)) {
      store = await storeModel.findById(storeId).exec();
    } else {
      store = await storeModel.findOne({ _id: storeId, owner: userId }).exec();
    }

    return store;
  }
}