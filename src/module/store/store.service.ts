import { BadRequestException, ConflictException, Injectable, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Store, StoreDocument } from './schema/store.schema';
import { User, UserDocument } from '../user/schema/user.schema';
import { UserRoleEnum } from '../../common/enums/user.enum';
import { CreateStoreDto } from './dto/create-store.dto';

@Injectable()
export class StoreService {
  private readonly logger = new Logger(StoreService.name);

  constructor(
    @InjectModel(Store.name) private readonly storeModel: Model<StoreDocument>,
  ) { }

  async createStore(dto: CreateStoreDto, user: UserDocument): Promise<{ success: boolean; data: Store; message: string }> {
    this.logger.log(`Creating store for user=${user._id}`);

    try {
      const existingStore = await this.storeModel
        .findOne({ name: dto.name, owner: user._id })
        .exec();
      if (existingStore) {
        throw new ConflictException(`Store with name ${dto.name} already exists for this user`);
      }

      const [newStore] = await this.storeModel.create([
        {
          ...dto,
          owner: user._id,
          createdAt: new Date(),
        },
      ]);

      const fullStore = await this.storeModel.findById(newStore._id).lean().exec();
      this.logger.log(`Created store id=${newStore._id}`);
      return {
        success: true,
        data: fullStore,
        message: 'Store created successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to create store: ${error.message}`, error.stack);
      throw error instanceof ConflictException
        ? error
        : new InternalServerErrorException('Failed to create store');
    }
  }

  async findUserStores(user: UserDocument): Promise<Store[]> {
    this.logger.log(`Fetching stores for user=${user._id}`);

    try {
      const stores = await this.storeModel.find({ owner: user._id }).exec();
      this.logger.log(`Found ${stores.length} stores`);
      return stores;
    } catch (error) {
      this.logger.error(`Failed to fetch stores: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to fetch stores');
    }
  }
}