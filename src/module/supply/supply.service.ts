import { BadRequestException, ConflictException, Injectable, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Supply, SupplyDocument } from './schema/supply.schema';
import { User, UserDocument } from '../user/schema/user.schema';
import { UserRoleEnum } from '../../common/enums/user.enum';
import { CreateSupplyDto } from './dto/supply.dto';
import { UpdateSupplierDto } from './dto/update-supply.dto';

@Injectable()
export class SupplierService {
  private readonly logger = new Logger(SupplierService.name);

  constructor(
    @InjectModel(Supply.name) private readonly supplierModel: Model<SupplyDocument>,
  ) { }

  async createSupplier(dto: CreateSupplyDto, user: UserDocument): Promise<{ success: boolean; data: Supply; message: string }> {
    this.logger.log(`Creating supplier for user=${user._id}, store=${dto.storeId}`);

    if (!Types.ObjectId.isValid(dto.storeId)) {
      throw new BadRequestException('Invalid store ID');
    }

    const store = await this.validateStoreAccess(dto.storeId, user._id.toString(), user.role);
    if (!store) {
      throw new BadRequestException('Store not found or you do not have permission');
    }

    try {
      const existingSupplier = await this.supplierModel
        .findOne({ email: dto.email, user: user._id, store: dto.storeId })
        .exec();
      if (existingSupplier) {
        throw new ConflictException(`Supplier with email ${dto.email} already exists in store ${dto.storeId}`);
      }

      const [createdSupplier] = await this.supplierModel.create([
        {
          ...dto,
          user: user._id,
          store: dto.storeId,
          createdAt: new Date(),
        },
      ]);

      const fullSupplier = await this.supplierModel.findById(createdSupplier._id).lean().exec();
      this.logger.log(`Created supplier id=${createdSupplier._id}`);
      return {
        success: true,
        data: fullSupplier,
        message: 'Supplier created successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to create supplier: ${error.message}`, error.stack);
      throw error instanceof ConflictException
        ? error
        : new InternalServerErrorException('Failed to create supplier');
    }
  }


  async updateSupplier(id: string, dto: UpdateSupplierDto, user: UserDocument): Promise<Supply> {
    this.logger.log(`Updating supplier id=${id} for user=${user._id}`);

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid supplier ID');
    }

    const supplier = await this.supplierModel.findOne({ _id: id, user: user._id }).exec();
    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    if (dto.storeId && dto.storeId !== supplier.store.toString()) {
      const store = await this.validateStoreAccess(dto.storeId, user._id.toString(), user.role);
      if (!store) {
        throw new BadRequestException('Store not found or you do not have permission');
      }
    }

    try {
      Object.assign(supplier, { ...dto, updatedAt: new Date() });
      const updatedSupplier = await supplier.save();
      this.logger.log(`Updated supplier id=${id}`);
      return updatedSupplier;
    } catch (error) {
      this.logger.error(`Failed to update supplier id=${id}: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Failed to update supplier with ID ${id}`);
    }
  }


  async findOne(user: UserDocument, filter: { id?: string; email?: string; storeId?: string }): Promise<Supply | null> {
    this.logger.log(`Finding supplier for user=${user._id}, filter=${JSON.stringify(filter)}`);

    if (filter.id && !Types.ObjectId.isValid(filter.id)) {
      throw new BadRequestException('Invalid supplier ID');
    }
    if (filter.storeId && !Types.ObjectId.isValid(filter.storeId)) {
      throw new BadRequestException('Invalid store ID');
    }

    const query: any = { user: user._id };
    if (filter.id) query._id = filter.id;
    if (filter.email) query.email = filter.email;
    if (filter.storeId) {
      const store = await this.validateStoreAccess(filter.storeId, user._id.toString(), user.role);
      if (!store) {
        throw new BadRequestException('Store not found or you do not have permission');
      }
      query.store = filter.storeId;
    }

    try {
      const supplier = await this.supplierModel.findOne(query).exec();
      this.logger.log(supplier ? `Found supplier id=${supplier._id}` : 'No supplier found');
      return supplier;
    } catch (error) {
      this.logger.error(`Failed to find supplier: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to find supplier');
    }
  }
  

  async findAll(user: UserDocument, storeId?: string, keyword?: string): Promise<Supply[]> {
    this.logger.log(`Finding all suppliers for user=${user._id}, store=${storeId || 'all'}, keyword=${keyword || 'none'}`);

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
    if (keyword) {
      const regex = new RegExp(keyword, 'i');
      query.$or = [
        { businessName: regex },
        { email: regex },
        { phoneNumber: regex },
      ];
    }

    try {
      const suppliers = await this.supplierModel.find(query).exec();
      this.logger.log(`Found ${suppliers.length} suppliers`);
      return suppliers;
    } catch (error) {
      this.logger.error(`Failed to find suppliers: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to find suppliers');
    }
  }

  private async validateStoreAccess(storeId: string, userId: string, userRole: UserRoleEnum[]): Promise<any> {
    const storeModel = this.supplierModel.db.model('Store');
    let store;

    if (userRole.includes(UserRoleEnum.ADMIN)) {
      store = await storeModel.findById(storeId).exec();
    } else {
      store = await storeModel.findOne({ _id: storeId, owner: userId }).exec();
    }

    return store;
  }
}