import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { BaseHelper } from 'src/utils/helper.util';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { User, UserDocument } from './schema/user.schema';
import { UserRoleEnum } from 'src/common/constants/enums/user.enum';
import { CoreService } from 'src/common/constants/core/service.core';
import { UserRepository } from './user.repository';
import { pinDto, changePinDto } from './dto/change-pin.dto';

@Injectable()
export class UserService extends CoreService<UserRepository> {
  constructor(
    private readonly repository: UserRepository,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {
    super(repository);
  }

  async createUser(dto: CreateUserDto) {
    try {
      const hashedPassword = await BaseHelper.hashData(dto.password);

      // Check for duplicate email or phone
      const existingUser = await this.userModel.findOne({
        $or: [{ email: dto.email }, { phone: dto.phone }],
      });

      if (existingUser) {
        throw new BadRequestException('Email or phone number already exists');
      }

      // Create user and ensure _id is assigned properly
      const newCustomer = new this.userModel({
        ...dto,
        _id: new mongoose.Types.ObjectId(), // Explicitly generate _id
        password: hashedPassword,
        role: dto.role || UserRoleEnum.USER,
      });

      await newCustomer.save();

      return {
        success: true,
        customer: newCustomer,
        email: dto.email,
      };
    } catch (err) {
      if (err.code === 11000) {
        throw new BadRequestException(
          `Duplicate entry detected: ${JSON.stringify(err.keyValue)}`,
        );
      }
      throw new BadRequestException(err.message || 'Failed to create customer');
    }
  }

  async findByIdAndUpdate(id: string, data: any): Promise<UserDocument> {
    return this.userModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async findById(id: string): Promise<UserDocument> {
    return this.userModel.findById(id).exec();
  }

  async findUserByMail(email: string) {
    return this.userModel.findOne({ email });
  }

  async findUserByName(name: string) {
    const user = await this.userModel.findOne({ username: name });
    if (!user) throw new NotFoundException('user not found');
    return user;
  }

  async getUserByFullname(name: string) {
    const user = await this.userModel.findOne({ name });
    if (!user) {
      throw new NotFoundException('user not found');
    }
    return user;
  }

  async updateCustomerByEmail(email: string, details: any) {
    return this.userModel.updateOne({ email }, details);
  }

  async saveRefreshToken(userId: string, refreshToken: string): Promise<void> {
    await this.userModel.updateOne({ _id: userId }, { refreshToken }).exec();
  }

  async removeRefreshToken(userId: string): Promise<void> {
    await this.userModel
      .updateOne({ _id: userId }, { $unset: { refreshToken: 1 } })
      .exec();
  }

  async getUserByEmailIncludePassword(email: string): Promise<UserDocument> {
    return this.userModel.findOne({ email }).select('+password');
  }

  async getUserByEmail(email: string): Promise<UserDocument> {
    return this.userModel.findOne({ email });
  }

  async updateUserByEmail(email: string, details: any) {
    return this.userModel.updateOne({ email }, details);
  }

  async checkUserExistByEmail(email: string): Promise<boolean> {
    const user = await this.getUserByEmail(email);

    if (!user) {
      throw new BadRequestException('No user exist with provided email');
    }

    return true;
  }

  async updatePin(id: string, details: pinDto) {
    const user = await this._find(id);
    const { pin, confirm_pin } = details;
    if (pin !== confirm_pin) {
      throw new BadRequestException('pin must be same with confirm pin');
    }
    if (pin === 1111) {
      throw new BadRequestException(
        "can't use default pin, choose another pin",
      );
    }
    user.pin = pin;
    user.defaultPinChanged = true;
    return user.save();
  }

  async changePin(id: string, details: changePinDto) {
    const user = await this._find(id);
    const { newPin, oldPin } = details;
    if (user.pin !== oldPin) {
      throw new BadRequestException('Invalid Pin format');
    }
    user.pin = newPin;
    return user.save();
  }

  async _find(id: string) {
    const user = await this.userModel.findById({ id });
    if (!user) throw new NotFoundException('user not found');
    return user;
  }

  async getUser(userId: string): Promise<UserDocument> {
    const user = await this.userModel
      .findOne({ _id: userId })
      .populate('interests')
      .lean();
    return user as UserDocument;
  }
}
