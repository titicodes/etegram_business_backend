import { Injectable, NotFoundException } from '@nestjs/common';
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

    async create(createStoreDto: CreateStoreDto): Promise<Store> {
        const user = await this.userService.findOne({ _id: createStoreDto.owner }); // Pass filter object

        if (!user) {
            throw new NotFoundException('User not found');
        }

        const createdStore = new this.storeModel(createStoreDto);
        const store = await createdStore.save();

        // Add store to user's stores array
        user.stores.push(store._id);
        await user.save();

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