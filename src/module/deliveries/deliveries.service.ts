import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Deliveries, DeliveriesDocument } from './schema/deliveries.schema';
import { User, UserDocument } from '../user/schema/user.schema';
import { Product, ProductDocument } from '../product/schema/product.schema';
import { UserRoleEnum } from '../../common/enums/user.enum';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';
import { CreateDeliveryDto } from './dto/delivery.dto';

@Injectable()
export class DeliveriesService {
    private readonly logger = new Logger(DeliveriesService.name);

    constructor(
        @InjectModel(Deliveries.name) private readonly deliveriesModel: Model<DeliveriesDocument>,
        @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    ) { }

    async createDelivery(dto: CreateDeliveryDto, user: UserDocument): Promise<{ success: boolean; data: Deliveries; message: string }> {
        this.logger.log(`Creating delivery for user=${user._id}, store=${dto.storeId}`);

        if (!Types.ObjectId.isValid(dto.storeId)) {
            throw new BadRequestException('Invalid store ID');
        }

        const store = await this.validateStoreAccess(dto.storeId, user._id.toString(), user.role);
        if (!store) {
            throw new BadRequestException('Store not found or you do not have permission');
        }

        const session = await this.deliveriesModel.db.startSession();
        try {
            const result = await session.withTransaction(async () => {
                const existingDelivery = await this.deliveriesModel
                    .findOne({ orderId: dto.orderId, user: user._id, store: dto.storeId })
                    .session(session)
                    .exec();
                if (existingDelivery) {
                    throw new ConflictException(`Delivery for order ${dto.orderId} already exists in this store`);
                }

                for (const item of dto.items) {
                    const product = await this.productModel
                        .findOne({ code: item.productCode, createdBy: user._id, store: dto.storeId })
                        .session(session)
                        .exec();
                    if (!product) {
                        throw new NotFoundException(`Product with code ${item.productCode} not found in store ${dto.storeId}`);
                    }
                    product.quantity += item.quantity;
                    await product.save({ session });
                }

                const [newDelivery] = await this.deliveriesModel.create(
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

                return newDelivery;
            });

            const fullDelivery = await this.deliveriesModel.findById(result._id).lean().exec();
            return {
                success: true,
                data: fullDelivery,
                message: 'Delivery created successfully',
            };
        } catch (error) {
            this.logger.error(`Failed to create delivery: ${error.message}`, error.stack);
            throw error instanceof ConflictException || error instanceof NotFoundException
                ? error
                : new InternalServerErrorException('Failed to create delivery');
        } finally {
            session.endSession();
        }
    }

    async findAllDeliveries(user: UserDocument, storeId?: string): Promise<Deliveries[]> {
        this.logger.log(`Fetching deliveries for user=${user._id}, store=${storeId || 'all'}`);

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
            const deliveries = await this.deliveriesModel.find(query).exec();
            this.logger.log(`Fetched ${deliveries.length} deliveries`);
            return deliveries;
        } catch (error) {
            this.logger.error(`Failed to fetch deliveries: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Failed to fetch deliveries');
        }
    }

    async findDeliveryById(id: string, user: UserDocument): Promise<Deliveries> {
        this.logger.log(`Fetching delivery id=${id} for user=${user._id}`);

        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException('Invalid delivery ID');
        }

        try {
            const delivery = await this.deliveriesModel.findOne({ _id: id, user: user._id }).exec();
            if (!delivery) {
                throw new NotFoundException(`Delivery with ID ${id} not found`);
            }
            this.logger.log(`Fetched delivery id=${id}`);
            return delivery;
        } catch (error) {
            this.logger.error(`Failed to fetch delivery id=${id}: ${error.message}`, error.stack);
            throw error instanceof NotFoundException
                ? error
                : new InternalServerErrorException(`Failed to fetch delivery with ID ${id}`);
        }
    }

    async updateDelivery(id: string, dto: UpdateDeliveryDto, user: UserDocument): Promise<Deliveries> {
        this.logger.log(`Updating delivery id=${id} for user=${user._id}`);

        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException('Invalid delivery ID');
        }

        const delivery = await this.deliveriesModel.findOne({ _id: id, user: user._id }).exec();
        if (!delivery) {
            throw new NotFoundException(`Delivery with ID ${id} not found`);
        }

        if (dto.storeId && dto.storeId !== delivery.store.toString()) {
            const store = await this.validateStoreAccess(dto.storeId, user._id.toString(), user.role);
            if (!store) {
                throw new BadRequestException('Store not found or you do not have permission');
            }
        }

        try {
            const updatedDelivery = await this.deliveriesModel
                .findOneAndUpdate({ _id: id, user: user._id }, { ...dto, updatedAt: new Date() }, { new: true })
                .exec();
            if (!updatedDelivery) {
                throw new NotFoundException(`Delivery with ID ${id} not found`);
            }
            this.logger.log(`Updated delivery id=${id}`);
            return updatedDelivery;
        } catch (error) {
            this.logger.error(`Failed to update delivery id=${id}: ${error.message}`, error.stack);
            throw error instanceof NotFoundException
                ? error
                : new InternalServerErrorException(`Failed to update delivery with ID ${id}`);
        }
    }

    async deleteDelivery(id: string, user: UserDocument): Promise<{ deleted: boolean }> {
        this.logger.log(`Deleting delivery id=${id} for user=${user._id}`);

        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException('Invalid delivery ID');
        }

        try {
            const result = await this.deliveriesModel.deleteOne({ _id: id, user: user._id }).exec();
            if (result.deletedCount === 0) {
                throw new NotFoundException(`Delivery with ID ${id} not found`);
            }
            this.logger.log(`Deleted delivery id=${id}`);
            return { deleted: true };
        } catch (error) {
            this.logger.error(`Failed to delete delivery id=${id}: ${error.message}`, error.stack);
            throw error instanceof NotFoundException
                ? error
                : new InternalServerErrorException(`Failed to delete delivery with ID ${id}`);
        }
    }

    async getInventorySummary(user: UserDocument, storeId: string): Promise<{
        totalStock: number;
        outOfStock: number;
        lowStock: number;
    }> {
        this.logger.log(`Fetching inventory summary for user=${user._id}, store=${storeId}`);

        if (!Types.ObjectId.isValid(storeId)) {
            throw new BadRequestException('Invalid store ID');
        }

        const store = await this.validateStoreAccess(storeId, user._id.toString(), user.role);
        if (!store) {
            throw new BadRequestException('Store not found or you do not have permission');
        }

        try {
            const products = await this.productModel.find({ createdBy: user._id, store: storeId }).exec();
            const totalStock = products.reduce((sum, p) => sum + p.quantity, 0);
            const outOfStock = products.filter((p) => p.quantity === 0).length;
            const lowStock = products.filter((p) => p.quantity > 0 && p.quantity <= 10).length;

            this.logger.log(`Inventory summary: totalStock=${totalStock}, outOfStock=${outOfStock}, lowStock=${lowStock}`);
            return { totalStock, outOfStock, lowStock };
        } catch (error) {
            this.logger.error(`Failed to fetch inventory summary: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Failed to fetch inventory summary');
        }
    }

    private async validateStoreAccess(storeId: string, userId: string, userRole: UserRoleEnum[]): Promise<any> {
        const storeModel = this.productModel.db.model('Store');
        let store;

        if (userRole.includes(UserRoleEnum.ADMIN)) {
            store = await storeModel.findById(storeId).exec();
        } else {
            store = await storeModel.findOne({ _id: storeId, owner: userId }).exec();
        }

        return store;
    }
}