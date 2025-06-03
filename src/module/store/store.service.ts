import { BadRequestException, ConflictException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Store, StoreDocument } from './schema/store.schema';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { UserService } from '../user/user.service';

@Injectable()
export class StoreService {
  private readonly logger = new Logger(StoreService.name);

  constructor(
    @InjectModel(Store.name) private readonly storeModel: Model<StoreDocument>,
    private readonly userService: UserService,
  ) { }

  async create(dto: CreateStoreDto, ownerId: string): Promise<{ success: boolean; data: Store; message: string }> {
    this.logger.log(`Creating store for user=${ownerId}, dto=${JSON.stringify(dto)}`);

    try {
      const existingStore = await this.storeModel
        .findOne({ name: dto.name, owner: ownerId })
        .exec();
      if (existingStore) {
        throw new ConflictException(`Store with name ${dto.name} already exists for this user`);
      }

      const [newStore] = await this.storeModel.create([
        {
          ...dto,
          owner: ownerId,
          createdAt: new Date(),
        },
      ]);

      await this.userService.addStoreToUser(ownerId, newStore._id.toString());

      const fullStore = await this.storeModel.findById(newStore._id).lean().exec();
      this.logger.log(`Created store id=${newStore._id}`);
      return {
        success: true,
        data: fullStore,
        message: 'Store created successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to create store: ${error.message}`, error.stack);
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException(`Failed to create store: ${error.message}`);
    }
  }

  async createBranch(dto: CreateStoreDto, ownerId: string, parentStoreId: string): Promise<{ success: boolean; data: Store; message: string }> {
    this.logger.log(`Creating branch for parentStore=${parentStoreId}, user=${ownerId}`);

    try {
      const parentStore = await this.storeModel.findOne({ _id: parentStoreId, owner: ownerId }).exec();
      if (!parentStore) {
        throw new NotFoundException('Parent store not found');
      }

      const existingStore = await this.storeModel
        .findOne({ name: dto.name, owner: ownerId })
        .exec();
      if (existingStore) {
        throw new ConflictException(`Store with name ${dto.name} already exists for this user`);
      }

      const [newBranch] = await this.storeModel.create([
        {
          ...dto,
          owner: ownerId,
          parentStore: parentStoreId,
          createdAt: new Date(),
        },
      ]);

      await this.userService.addStoreToUser(ownerId, newBranch._id.toString());

      const fullBranch = await this.storeModel.findById(newBranch._id).lean().exec();
      this.logger.log(`Created branch id=${newBranch._id}`);
      return {
        success: true,
        data: fullBranch,
        message: 'Branch created successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to create branch: ${error.message}`, error.stack);
      throw error instanceof ConflictException || error instanceof NotFoundException
        ? error
        : new BadRequestException('Failed to create branch');
    }
  }

  async findByOwner(ownerId: string): Promise<Store[]> {
    this.logger.log(`Fetching stores for user=${ownerId}`);

    try {
      const stores = await this.storeModel.find({ owner: ownerId }).exec();
      this.logger.log(`Found ${stores.length} stores`);
      return stores;
    } catch (error) {
      this.logger.error(`Failed to fetch stores: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to fetch stores');
    }
  }

  async findById(id: string, ownerId: string): Promise<Store | null> {
    this.logger.log(`Fetching store id=${id} for user=${ownerId}`);

    try {
      const store = await this.storeModel.findOne({ _id: id, owner: ownerId }).exec();
      if (!store) {
        throw new NotFoundException('Store not found');
      }
      this.logger.log(`Found store id=${id}`);
      return store;
    } catch (error) {
      this.logger.error(`Failed to fetch store: ${error.message}`, error.stack);
      throw error;
    }
  }

  async update(id: string, dto: UpdateStoreDto, ownerId: string): Promise<Store> {
    this.logger.log(`Updating store id=${id} for user=${ownerId}`);

    try {
      const store = await this.storeModel.findOne({ _id: id, owner: ownerId }).exec();
      if (!store) {
        throw new NotFoundException('Store not found');
      }

      const updatedStore = await this.storeModel.findByIdAndUpdate(
        id,
        { ...dto, updatedAt: new Date() },
        { new: true },
      ).exec();

      if (!updatedStore) {
        throw new NotFoundException('Failed to update store');
      }

      this.logger.log(`Updated store id=${id}`);
      return updatedStore;
    } catch (error) {
      this.logger.error(`Failed to update store: ${error.message}`, error.stack);
      throw error;
    }
  }

  async delete(id: string, ownerId: string): Promise<void> {
    this.logger.log(`Deleting store id=${id} for user=${ownerId}`);

    try {
      const store = await this.storeModel.findOne({ _id: id, owner: ownerId }).exec();
      if (!store) {
        throw new NotFoundException('Store not found');
      }

      await this.storeModel.deleteOne({ _id: id }).exec();
      await this.userService.removeStoreFromUser(ownerId, id);
      this.logger.log(`Deleted store id=${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete store: ${error.message}`, error.stack);
      throw error;
    }
  }
}