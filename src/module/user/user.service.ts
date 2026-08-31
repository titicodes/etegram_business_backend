import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  OnModuleInit,
} from '@nestjs/common';
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
  private readonly logger = new Logger(UserService.name);
  private subscriptionService: SubscriptionService;

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Store.name) private storeModel: Model<StoreDocument>,
    private readonly jwtService: JwtService,
    private moduleRef: ModuleRef,
  ) {}

  onModuleInit() {
    // Lazily required to avoid a circular import with SubscriptionService,
    // which imports UserService directly.
    this.subscriptionService = this.moduleRef.get(
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../subscription/subscription.service').SubscriptionService,
      { strict: false },
    );
  }

  async createUser(
    dto: CreateUserDto,
  ): Promise<{ customer: User; accessToken: string; refreshToken: string }> {
    this.logger.log('[UserService][createUser] Starting user creation:', {
      email: dto.email,
    });
    const {
      email,
      password,
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
    } = dto;

    this.logger.log('[UserService][createUser] Hashing password');
    const hashedPassword = await BaseHelper.hashData(password);

    this.logger.log('[UserService][createUser] Creating user document');
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

    this.logger.log('[UserService][createUser] Saving user');
    await user.save();

    this.logger.log('[UserService][createUser] Creating subscription');
    try {
      if (this.subscriptionService) {
        await this.subscriptionService.createSubscription(user._id.toString());
        this.logger.log(
          '[UserService][createUser] Subscription created for user:',
          { userId: user._id },
        );
      } else {
        this.logger.error(
          '[UserService][createUser] SubscriptionService not initialized, skipping subscription',
        );
      }
    } catch (error) {
      this.logger.error(
        '[UserService][createUser] Subscription creation failed:',
        { error: error.message, stack: error.stack },
      );
      throw new BadRequestException(
        `Failed to create subscription: ${error.message}`,
      );
    }

    this.logger.log('[UserService][createUser] Generating tokens');
    const accessToken = this.jwtService.sign(
      { _id: user._id.toString(), email: user.email, role: user.role },
      { secret: process.env.JWT_SECRET, expiresIn: '15m' },
    );
    const refreshToken = this.jwtService.sign(
      { _id: user._id.toString() },
      { secret: process.env.JWT_REFRESH_SECRET, expiresIn: '7d' },
    );

    this.logger.log('[UserService][createUser] Saving refresh token');
    user.refreshToken = refreshToken;
    await user.save();

    this.logger.log('[UserService][createUser] User creation completed:', {
      userId: user._id,
      email: user.email,
    });
    return { customer: user, accessToken, refreshToken };
  }

  async findById(id: string): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(id)) {
      this.logger.error('[UserService][findById] Invalid user ID:', { id });
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.userModel.findById(id).populate('stores').exec();
    if (!user) {
      this.logger.error('[UserService][findById] User not found:', { id });
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async getUserByIdIncludePassword(userId: string): Promise<UserDocument> {
    const user = await this.userModel
      .findById(userId)
      .select('+password')
      .exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateUserById(
    userId: string,
    update: Partial<User>,
  ): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(userId, update, { new: true })
      .exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByIdAndUpdate(id: string, data: any): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(id)) {
      this.logger.error('[UserService][findByIdAndUpdate] Invalid user ID:', {
        id,
      });
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.userModel
      .findByIdAndUpdate(id, data, { new: true })
      .exec();
    if (!user) {
      this.logger.error('[UserService][findByIdAndUpdate] User not found:', {
        id,
      });
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async getUserByEmail(email: string): Promise<UserDocument> {
    const user = await this.userModel
      .findOne({ email })
      .populate('stores')
      .exec();
    if (!user) {
      this.logger.error('[UserService][getUserByEmail] User not found:', {
        email,
      });
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async getUserByEmailIncludePassword(email: string): Promise<UserDocument> {
    const user = await this.userModel
      .findOne({ email })
      .select('+password')
      .populate('stores')
      .exec();
    if (!user) {
      this.logger.error(
        '[UserService][getUserByEmailIncludePassword] User not found:',
        { email },
      );
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async checkUserExistByEmail(email: string): Promise<void> {
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) {
      this.logger.error(
        '[UserService][checkUserExistByEmail] User not found:',
        { email },
      );
      throw new NotFoundException('User not found');
    }
  }

  async updateUserByEmail(email: string, data: any): Promise<void> {
    const result = await this.userModel.updateOne({ email }, data).exec();
    if (result.matchedCount === 0) {
      this.logger.error('[UserService][updateUserByEmail] User not found:', {
        email,
      });
      throw new NotFoundException('User not found');
    }
    this.logger.log('[UserService][updateUserByEmail] User updated:', {
      email,
    });
  }

  async saveRefreshToken(userId: string, refreshToken: string): Promise<void> {
    if (!Types.ObjectId.isValid(userId)) {
      this.logger.error('[UserService][saveRefreshToken] Invalid user ID:', {
        userId,
      });
      throw new BadRequestException('Invalid user ID');
    }

    await this.userModel.updateOne({ _id: userId }, { refreshToken }).exec();
    this.logger.log('[UserService][saveRefreshToken] Refresh token saved:', {
      userId,
    });
  }

  async removeRefreshToken(userId: string): Promise<void> {
    if (!Types.ObjectId.isValid(userId)) {
      this.logger.error('[UserService][removeRefreshToken] Invalid user ID:', {
        userId,
      });
      throw new BadRequestException('Invalid user ID');
    }

    await this.userModel
      .updateOne({ _id: userId }, { $unset: { refreshToken: 1 } })
      .exec();
    this.logger.log(
      '[UserService][removeRefreshToken] Refresh token removed:',
      { userId },
    );
  }

  async updatePin(id: string, details: pinDto) {
    const user = await this.findById(id);
    const { pin, confirmPin } = details;

    if (pin !== confirmPin) {
      this.logger.error('[UserService][updatePin] Pin mismatch:', {
        userId: id,
      });
      throw new BadRequestException('Pin must match the confirm pin');
    }

    if (pin === '1111') {
      this.logger.error('[UserService][updatePin] Default pin used:', {
        userId: id,
      });
      throw new BadRequestException(
        "Can't use default pin, choose another pin",
      );
    }

    user.pin = pin;
    user.defaultPinChanged = true;
    await user.save();
    this.logger.log('[UserService][updatePin] Pin updated:', { userId: id });
    return user;
  }

  async changePin(id: string, details: changePinDto) {
    const user = await this.findById(id);
    const { newPin, oldPin } = details;

    if (user.pin !== oldPin) {
      this.logger.error('[UserService][changePin] Invalid current pin:', {
        userId: id,
      });
      throw new BadRequestException('Invalid current pin');
    }

    if (newPin === oldPin) {
      this.logger.error('[UserService][changePin] New pin same as old:', {
        userId: id,
      });
      throw new BadRequestException(
        'New pin cannot be the same as the old pin',
      );
    }

    user.pin = newPin;
    await user.save();
    this.logger.log('[UserService][changePin] Pin changed:', { userId: id });
    return user;
  }

  async getUser(
    request: any,
  ): Promise<{ user: UserDocument; accessToken: string }> {
    this.logger.log('[UserService][getUser] Headers:', request.headers);

    if (!request.user || !request.user._id) {
      this.logger.error(
        '[UserService][getUser] Missing user authentication data',
      );
      throw new UnauthorizedException(
        'Invalid request: Missing user authentication',
      );
    }

    const user = await this.userModel
      .findOne({ _id: request.user._id })
      .populate('stores')
      .exec();

    if (!user) {
      this.logger.error('[UserService][getUser] User not found:', {
        userId: request.user._id,
      });
      throw new NotFoundException('User not found');
    }

    this.logger.log('[UserService][getUser] User fetched:', {
      userId: user._id,
      email: user.email,
    });

    return {
      user,
      accessToken: request.headers.authorization?.split(' ')[1],
    };
  }

  async updateUserFcmToken(
    userId: string,
    fcmToken: string,
  ): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(userId)) {
      this.logger.error('[UserService][updateUserFcmToken] Invalid user ID:', {
        userId,
      });
      throw new BadRequestException('Invalid user ID');
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(userId, { fcmToken }, { new: true })
      .exec();

    if (!updatedUser) {
      this.logger.error('[UserService][updateUserFcmToken] User not found:', {
        userId,
      });
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    this.logger.log('[UserService][updateUserFcmToken] FCM token updated:', {
      userId,
    });
    return updatedUser;
  }

  async addStoreToUser(userId: string, storeId: string): Promise<void> {
    if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(storeId)) {
      this.logger.error(
        '[UserService][addStoreToUser] Invalid user or store ID:',
        { userId, storeId },
      );
      throw new BadRequestException('Invalid user or store ID');
    }

    await this.userModel
      .updateOne({ _id: userId }, { $addToSet: { stores: storeId } })
      .exec();
    this.logger.log('[UserService][addStoreToUser] Store added to user:', {
      userId,
      storeId,
    });
  }

  async removeStoreFromUser(userId: string, storeId: string): Promise<void> {
    if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(storeId)) {
      this.logger.error(
        '[UserService][removeStoreFromUser] Invalid user or store ID:',
        { userId, storeId },
      );
      throw new BadRequestException('Invalid user or store ID');
    }

    const result = await this.userModel
      .updateOne({ _id: userId }, { $pull: { stores: storeId } })
      .exec();

    if (result.matchedCount === 0) {
      this.logger.error('[UserService][removeStoreFromUser] User not found:', {
        userId,
      });
      throw new NotFoundException('User not found');
    }

    this.logger.log(
      '[UserService][removeStoreFromUser] Store removed from user:',
      { userId, storeId },
    );
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
    this.logger.log(`Updated FCM token for user ${userId}`);
  }

  async uploadProfileImage(
    userId: string,
    file: Express.Multer.File,
  ): Promise<UserDocument> {
    this.logger.log('[UserService][uploadProfileImage] Input:', {
      userId,
      file: file
        ? {
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            buffer: file.buffer ? 'present' : 'missing',
          }
        : 'no file',
    });

    if (!Types.ObjectId.isValid(userId)) {
      this.logger.error('[UserService][uploadProfileImage] Invalid user ID:', {
        userId,
      });
      throw new BadRequestException('Invalid user ID');
    }

    if (!file || !file.buffer || !file.mimetype) {
      this.logger.error(
        '[UserService][uploadProfileImage] Invalid or missing file:',
        { userId, file },
      );
      throw new BadRequestException('No valid image file provided');
    }

    try {
      const user = await this.userModel.findById(userId).exec();
      if (!user) {
        this.logger.error('[UserService][uploadProfileImage] User not found:', {
          userId,
        });
        throw new NotFoundException('User not found');
      }

      const fileExtension = file.mimetype.split('/')[1]?.toLowerCase();
      const supportedFormats = ['jpeg', 'jpg', 'png', 'gif', 'webp', 'bmp'];
      if (!supportedFormats.includes(fileExtension)) {
        this.logger.error(
          '[UserService][uploadProfileImage] Unsupported file type:',
          { userId, mimetype: file.mimetype },
        );
        throw new BadRequestException(
          `Unsupported file type. Only ${supportedFormats.join(', ')} allowed`,
        );
      }

      const maxFileSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxFileSize) {
        this.logger.error('[UserService][uploadProfileImage] File too large:', {
          userId,
          size: file.size,
        });
        throw new BadRequestException('File size exceeds 5MB limit');
      }

      const uploadResponse = await imagekit.upload({
        file: file.buffer,
        fileName: `user_${userId}_${Date.now()}.${fileExtension}`,
        folder: '/profile_images',
      });

      if (!uploadResponse.url) {
        this.logger.error(
          '[UserService][uploadProfileImage] ImageKit upload failed, no URL returned:',
          { userId },
        );
        throw new BadRequestException('Failed to upload image to ImageKit');
      }

      user.imageUrl = uploadResponse.url;
      await user.save();

      this.logger.log(
        '[UserService][uploadProfileImage] Profile image uploaded:',
        { userId, imageUrl: uploadResponse.url },
      );
      return user;
    } catch (error) {
      this.logger.error('[UserService][uploadProfileImage] Error:', {
        userId,
        error: error.message,
        stack: error.stack,
      });
      throw new BadRequestException(
        `Failed to upload profile image: ${error.message}`,
      );
    }
  }
}
