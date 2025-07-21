

import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { BaseHelper } from '../../utils/helper.util';
import { User, UserDocument } from './schema/user.schema';
import { pinDto, changePinDto } from './dto/change-pin.dto';
import { JwtService } from '@nestjs/jwt';
import { Store, StoreDocument } from '../store/schema/store.schema';
import { UserRoleEnum } from '../../common/enums/user.enum';
import { SubscriptionService } from '../subscription/subscription.service';
import { ModuleRef } from '@nestjs/core';
import { imagekit } from 'src/common/config/imagekit.config';

@Injectable()
export class UserService implements OnModuleInit {
  private subscriptionService: SubscriptionService;

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Store.name) private storeModel: Model<StoreDocument>,
    private readonly jwtService: JwtService,
    private moduleRef: ModuleRef,

  ) { }

  onModuleInit() {

    this.subscriptionService = this.moduleRef.get(
      require('../subscription/subscription.service').SubscriptionService,
      { strict: false }
    );
  }

  async createUser(dto: CreateUserDto): Promise<{ customer: User; accessToken: string; refreshToken: string }> {
    console.log('[UserService][createUser] Starting user creation:', { email: dto.email });
    const { email, password, firstName, lastName, phoneNumber, country, state, city, area, currency, businessType, businessName } = dto;

    console.log('[UserService][createUser] Hashing password');
    const hashedPassword = await BaseHelper.hashData(password);

    console.log('[UserService][createUser] Creating user document');
    const user = new this.userModel({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      phoneNumber,
      country,
      state,
      city,
      area,
      currency,
      businessType,
      businessName,
      role: [UserRoleEnum.STORE_OWNER],
      stores: [],
      store: null,
      emailVerified: false,
    });

    console.log('[UserService][createUser] Saving user');
    await user.save();

    console.log('[UserService][createUser] Creating subscription');
    try {
      if (this.subscriptionService) {
        await this.subscriptionService.createSubscription(user._id.toString());
        console.log('[UserService][createUser] Subscription created for user:', { userId: user._id });
      } else {
        console.error('[UserService][createUser] SubscriptionService not initialized, skipping subscription');
      }
    } catch (error) {
      console.error('[UserService][createUser] Subscription creation failed:', { error: error.message, stack: error.stack });
      throw new BadRequestException(`Failed to create subscription: ${error.message}`);
    }

    console.log('[UserService][createUser] Generating tokens');
    const accessToken = this.jwtService.sign(
      { _id: user._id.toString(), email: user.email, role: user.role },
      { secret: process.env.JWT_SECRET, expiresIn: '15m' },
    );
    const refreshToken = this.jwtService.sign(
      { _id: user._id.toString() },
      { secret: process.env.JWT_REFRESH_SECRET, expiresIn: '7d' },
    );

    console.log('[UserService][createUser] Saving refresh token');
    user.refreshToken = refreshToken;
    await user.save();

    console.log('[UserService][createUser] User creation completed:', { userId: user._id, email: user.email });
    return { customer: user, accessToken, refreshToken };
  }

  async findById(id: string): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(id)) {
      console.error('[UserService][findById] Invalid user ID:', { id });
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.userModel.findById(id).populate('stores').exec();
    if (!user) {
      console.error('[UserService][findById] User not found:', { id });
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByIdAndUpdate(id: string, data: any): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(id)) {
      console.error('[UserService][findByIdAndUpdate] Invalid user ID:', { id });
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.userModel.findByIdAndUpdate(id, data, { new: true }).exec();
    if (!user) {
      console.error('[UserService][findByIdAndUpdate] User not found:', { id });
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async getUserByEmail(email: string): Promise<UserDocument> {
    const user = await this.userModel.findOne({ email }).populate('stores').exec();
    if (!user) {
      console.error('[UserService][getUserByEmail] User not found:', { email });
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async getUserByEmailIncludePassword(email: string): Promise<UserDocument> {
    const user = await this.userModel.findOne({ email }).select('+password').populate('stores').exec();
    if (!user) {
      console.error('[UserService][getUserByEmailIncludePassword] User not found:', { email });
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async checkUserExistByEmail(email: string): Promise<void> {
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) {
      console.error('[UserService][checkUserExistByEmail] User not found:', { email });
      throw new NotFoundException('User not found');
    }
  }

  async updateUserByEmail(email: string, data: any): Promise<void> {
    const result = await this.userModel.updateOne({ email }, data).exec();
    if (result.matchedCount === 0) {
      console.error('[UserService][updateUserByEmail] User not found:', { email });
      throw new NotFoundException('User not found');
    }
    console.log('[UserService][updateUserByEmail] User updated:', { email });
  }

  async saveRefreshToken(userId: string, refreshToken: string): Promise<void> {
    if (!Types.ObjectId.isValid(userId)) {
      console.error('[UserService][saveRefreshToken] Invalid user ID:', { userId });
      throw new BadRequestException('Invalid user ID');
    }

    await this.userModel.updateOne({ _id: userId }, { refreshToken }).exec();
    console.log('[UserService][saveRefreshToken] Refresh token saved:', { userId });
  }

  async removeRefreshToken(userId: string): Promise<void> {
    if (!Types.ObjectId.isValid(userId)) {
      console.error('[UserService][removeRefreshToken] Invalid user ID:', { userId });
      throw new BadRequestException('Invalid user ID');
    }

    await this.userModel.updateOne({ _id: userId }, { $unset: { refreshToken: 1 } }).exec();
    console.log('[UserService][removeRefreshToken] Refresh token removed:', { userId });
  }

  async updatePin(id: string, details: pinDto) {
    const user = await this.findById(id);
    const { pin, confirmPin } = details;

    if (pin !== confirmPin) {
      console.error('[UserService][updatePin] Pin mismatch:', { userId: id });
      throw new BadRequestException('Pin must match the confirm pin');
    }

    if (pin === '1111') {
      console.error('[UserService][updatePin] Default pin used:', { userId: id });
      throw new BadRequestException("Can't use default pin, choose another pin");
    }

    user.pin = pin;
    user.defaultPinChanged = true;
    await user.save();
    console.log('[UserService][updatePin] Pin updated:', { userId: id });
    return user;
  }

  async changePin(id: string, details: changePinDto) {
    const user = await this.findById(id);
    const { newPin, oldPin } = details;

    if (user.pin !== oldPin) {
      console.error('[UserService][changePin] Invalid current pin:', { userId: id });
      throw new BadRequestException('Invalid current pin');
    }

    if (newPin === oldPin) {
      console.error('[UserService][changePin] New pin same as old:', { userId: id });
      throw new BadRequestException('New pin cannot be the same as the old pin');
    }

    user.pin = newPin;
    await user.save();
    console.log('[UserService][changePin] Pin changed:', { userId: id });
    return user;
  }

  async getUser(request: any): Promise<{ user: UserDocument; accessToken: string }> {
    console.log('[UserService][getUser] Headers:', request.headers);

    if (!request.user || !request.user._id) {
      console.error('[UserService][getUser] Missing user authentication data');
      throw new UnauthorizedException('Invalid request: Missing user authentication');
    }

    const user = await this.userModel
      .findOne({ _id: request.user._id })
      .populate('stores')
      .exec();

    if (!user) {
      console.error('[UserService][getUser] User not found:', { userId: request.user._id });
      throw new NotFoundException('User not found');
    }

    console.log('[UserService][getUser] User fetched:', { userId: user._id, email: user.email });

    return {
      user,
      accessToken: request.headers.authorization?.split(' ')[1],
    };
  }

  async updateUserFcmToken(userId: string, fcmToken: string): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(userId)) {
      console.error('[UserService][updateUserFcmToken] Invalid user ID:', { userId });
      throw new BadRequestException('Invalid user ID');
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(userId, { fcmToken }, { new: true })
      .exec();

    if (!updatedUser) {
      console.error('[UserService][updateUserFcmToken] User not found:', { userId });
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    console.log('[UserService][updateUserFcmToken] FCM token updated:', { userId });
    return updatedUser;
  }

  async addStoreToUser(userId: string, storeId: string): Promise<void> {
    if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(storeId)) {
      console.error('[UserService][addStoreToUser] Invalid user or store ID:', { userId, storeId });
      throw new BadRequestException('Invalid user or store ID');
    }

    await this.userModel
      .updateOne({ _id: userId }, { $addToSet: { stores: storeId } })
      .exec();
    console.log('[UserService][addStoreToUser] Store added to user:', { userId, storeId });
  }

  async removeStoreFromUser(userId: string, storeId: string): Promise<void> {
    if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(storeId)) {
      console.error('[UserService][removeStoreFromUser] Invalid user or store ID:', { userId, storeId });
      throw new BadRequestException('Invalid user or store ID');
    }

    const result = await this.userModel
      .updateOne({ _id: userId }, { $pull: { stores: storeId } })
      .exec();

    if (result.matchedCount === 0) {
      console.error('[UserService][removeStoreFromUser] User not found:', { userId });
      throw new NotFoundException('User not found');
    }

    console.log('[UserService][removeStoreFromUser] Store removed from user:', { userId, storeId });
  }

  async updateFcmToken(userId: string, fcmToken: string): Promise<void> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.fcmToken = fcmToken;
    await user.save();
    console.log(`Updated FCM token for user ${userId}`);
  }


  async uploadProfileImage(userId: string, file: Express.Multer.File): Promise<UserDocument> {
    console.log('[UserService][uploadProfileImage] Input:', {
      userId,
      file: file ? {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer ? 'present' : 'missing',
      } : 'no file',
    });

    if (!Types.ObjectId.isValid(userId)) {
      console.error('[UserService][uploadProfileImage] Invalid user ID:', { userId });
      throw new BadRequestException('Invalid user ID');
    }

    if (!file || !file.buffer || !file.mimetype) {
      console.error('[UserService][uploadProfileImage] Invalid or missing file:', { userId, file });
      throw new BadRequestException('No valid image file provided');
    }

    try {
      const user = await this.userModel.findById(userId).exec();
      if (!user) {
        console.error('[UserService][uploadProfileImage] User not found:', { userId });
        throw new NotFoundException('User not found');
      }

      const fileExtension = file.mimetype.split('/')[1]?.toLowerCase();
      const supportedFormats = ['jpeg', 'jpg', 'png', 'gif', 'webp', 'bmp'];
      if (!supportedFormats.includes(fileExtension)) {
        console.error('[UserService][uploadProfileImage] Unsupported file type:', { userId, mimetype: file.mimetype });
        throw new BadRequestException(`Unsupported file type. Only ${supportedFormats.join(', ')} allowed`);
      }

      const maxFileSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxFileSize) {
        console.error('[UserService][uploadProfileImage] File too large:', { userId, size: file.size });
        throw new BadRequestException('File size exceeds 5MB limit');
      }

      const uploadResponse = await imagekit.upload({
        file: file.buffer,
        fileName: `user_${userId}_${Date.now()}.${fileExtension}`,
        folder: '/profile_images',
      });

      if (!uploadResponse.url) {
        console.error('[UserService][uploadProfileImage] ImageKit upload failed, no URL returned:', { userId });
        throw new BadRequestException('Failed to upload image to ImageKit');
      }

      user.imageUrl = uploadResponse.url;
      await user.save();

      console.log('[UserService][uploadProfileImage] Profile image uploaded:', { userId, imageUrl: uploadResponse.url });
      return user;
    } catch (error) {
      console.error('[UserService][uploadProfileImage] Error:', { userId, error: error.message, stack: error.stack });
      throw new BadRequestException(`Failed to upload profile image: ${error.message}`);
    }
  }


}