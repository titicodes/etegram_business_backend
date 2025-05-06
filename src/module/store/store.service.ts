import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Store, StoreDocument } from './schema/store.schema';
import { CreateStoreDto } from './dto/create-store.dto';
import { UserService } from '../user/user.service';
import { UpdateStoreDto } from './dto/update-store.dto';

@Injectable()
export class StoreService {
  constructor(
    @InjectModel(Store.name) private storeModel: Model<StoreDocument>,
    private userService: UserService,
  ) { }

  async create(createStoreDto: CreateStoreDto, ownerId: string): Promise<Store> {
    const user = await this.userService.findOne({ _id: ownerId });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.store) {
      throw new BadRequestException('User already has a store');
    }

    const createdStore = new this.storeModel({
      ...createStoreDto,
      owner: ownerId,
    });

    const store = await createdStore.save();

    user.store = store._id;
    await user.save();

    return store;
  }

  async findById(id: string): Promise<Store> {
    const store = await this.storeModel.findById(id).exec();
    if (!store) {
      throw new NotFoundException('Store not found');
    }
    return store;
  }

  async findByOwner(ownerId: string): Promise<Store[]> {
    return this.storeModel.find({ owner: ownerId }).exec();
  }

  async update(id: string, updateStoreDto: UpdateStoreDto): Promise<Store> {
    const updatedStore = await this.storeModel.findByIdAndUpdate(id, updateStoreDto, { new: true }).exec();

    if (!updatedStore) {
      throw new NotFoundException('Store not found');
    }

    return updatedStore;
  }
}