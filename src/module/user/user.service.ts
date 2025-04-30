import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { BaseHelper } from 'src/utils/helper.util';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { User, UserDocument } from './schema/user.schema';
import { CoreService } from 'src/common/constants/core/service.core';
import { UserRepository } from './user.repository';
import { pinDto, changePinDto } from './dto/change-pin.dto';
import { JwtService } from '@nestjs/jwt';
import { ObjectId } from 'mongodb';
import { Store, StoreDocument } from '../store/schema/store.schema';


@Injectable()
export class UserService extends CoreService<UserRepository> {
  constructor(
    private readonly repository: UserRepository,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Store.name) private storeModel: Model<StoreDocument>,
    private readonly jwtService: JwtService,
  ) {
    super(repository);
  }

  async createUser(dto: CreateUserDto) {
    try {
      // Check if email already exists
      const existingUser = await this.userModel.findOne({ email: dto.email });

      if (existingUser) {
        throw new BadRequestException('Email already exists');
      }

      // Hash password
      const hashedPassword = await BaseHelper.hashData(dto.password);

      // Create user object (Mongoose will generate _id automatically)
      const newCustomer = new this.userModel({
        ...dto,
        password: hashedPassword,
      });

      await newCustomer.save(); // Save user

      // Generate JWT tokens
      const tokenPayload = { _id: newCustomer._id };
      const accessToken = this.jwtService.sign(tokenPayload);
      const refreshToken = this.jwtService.sign(
        { _id: newCustomer._id },
        {
          secret: process.env.JWT_REFRESH_SECRET,
          expiresIn: process.env.JWT_REFRESH_EXPIRATION_TIME,
        },
      );

      await this.saveRefreshToken(newCustomer._id.toString(), refreshToken);

      return {
        success: true,
        customer: newCustomer,
        email: dto.email,
        phone: dto.phone,
        accessToken,
        refreshToken,
      };
    } catch (err) {
      // Handle MongoDB duplicate key error
      if (err.code === 11000) {
        throw new BadRequestException(
          `Duplicate entry detected: ${JSON.stringify(err.keyValue)}`
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
    const { pin, confirmPin } = details;

    if (pin !== confirmPin) {
      throw new BadRequestException('Pin must match the confirm pin.');
    }

    if (pin === 1111) {
      throw new BadRequestException("Can't use default pin, choose another pin.");
    }

    user.pin = pin;
    user.defaultPinChanged = true;
    return await user.save();
  }


  async changePin(id: string, details: changePinDto) {
    const user = await this._find(id);
    const { newPin, oldPin } = details;

    if (user.pin !== oldPin) {
      throw new BadRequestException('Invalid current pin.');
    }

    if (newPin === oldPin) {
      throw new BadRequestException('New pin cannot be the same as the old pin.');
    }

    user.pin = newPin;
    return await user.save();
  }

  async _find(id: string) {
    try {
      const userId = new ObjectId(id); // Ensure conversion to ObjectId
      return await this.userModel.findById(userId).exec();
    } catch (error) {
      throw new BadRequestException('Invalid user ID format.');
    }
  }


  // async _find(id: string) {
  //   const user = await this.userModel.findById({ id });
  //   if (!user) throw new NotFoundException('user not found');
  //   return user;
  // }

  // async getUser(userId: string): Promise<UserDocument> {
  //   const user = await this.userModel
  //     .findOne({ _id: userId })
  //     .populate('interests')
  //     .lean();
  //   return user as UserDocument;
  // }

  async getUser(request: any): Promise<{ user: UserDocument; accessToken: string }> {
    console.log("[getUser] Headers:", request.headers); // Log all headers
    console.log("[getUser] Received Token:", request.headers.authorization); // Log token

    if (!request.user || !request.user._id) {
      console.error("[getUser] Error: Missing user authentication data.");
      throw new UnauthorizedException("Invalid request: Missing user authentication");
    }

    const user = await this.userModel.findOne({ _id: request.user._id }).populate("interests").lean();

    if (!user) {
      console.error(`[getUser] Error: User with ID ${request.user._id} not found.`);
      throw new NotFoundException("User not found");
    }

    return { user, accessToken: request.headers.authorization?.split(" ")[1] };
  }

  async updateUserFcmToken(userId: string, fcmToken: string): Promise<User> {
    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      { fcmToken: fcmToken },
      { new: true },
    ).exec();

    if (!updatedUser) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return updatedUser;
  }

}
