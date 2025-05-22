import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { BaseHelper } from '../../utils/helper.util';
import { User, UserDocument } from './schema/user.schema';
import { pinDto, changePinDto } from './dto/change-pin.dto';
import { JwtService } from '@nestjs/jwt';
import { Store, StoreDocument } from '../store/schema/store.schema';
import { UserRoleEnum } from '../../common/enums/user.enum';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Store.name) private storeModel: Model<StoreDocument>,
    private readonly jwtService: JwtService,
  ) { }

  // async createUser(dto: CreateUserDto) {
  //   console.log('[UserService][createUser] Creating user:', { email: dto.email });

  //   const existingUser = await this.userModel.findOne({ email: dto.email }).exec();
  //   if (existingUser) {
  //     console.error('[UserService][createUser] Email already exists:', { email: dto.email });
  //     throw new BadRequestException('Email already exists');
  //   }

  //   const hashedPassword = await BaseHelper.hashData(dto.password);

  //   const newUser = new this.userModel({
  //     ...dto,
  //     password: hashedPassword,
  //     stores: [],
  //       store: null,
  //     emailVerified: false,
  //     role: [UserRoleEnum.STORE_OWNER], // Default role
  //   });

  //   await newUser.save();

  //   const tokenPayload = { _id: newUser._id.toString(), email: newUser.email, role: newUser.role };
  //   const accessToken = this.jwtService.sign(tokenPayload, {
  //     secret: process.env.JWT_SECRET,
  //     expiresIn: process.env.JWT_EXPIRATION_TIME || '15m',
  //   });
  //   const refreshToken = this.jwtService.sign(
  //     { _id: newUser._id.toString() },
  //     {
  //       secret: process.env.JWT_REFRESH_SECRET,
  //       expiresIn: process.env.JWT_REFRESH_EXPIRATION_TIME || '7d',
  //     },
  //   );

  //   await this.saveRefreshToken(newUser._id.toString(), refreshToken);

  //   console.log('[UserService][createUser] User created:', { userId: newUser._id, email: newUser.email });

  //   return {
  //     success: true,
  //     customer: newUser,
  //     email: newUser.email,
  //     phone: newUser.phone,
  //     accessToken,
  //     refreshToken,
  //   };
  // }

  async createUser(dto: CreateUserDto): Promise<{ customer: User; accessToken: string; refreshToken: string }> {
    const { email, password } = dto;

    const existingUser = await this.userModel.findOne({ email }).exec();
    if (existingUser) {
      throw new ConflictException(`User with email ${email} already exists`);
    }

    const hashedPassword = await BaseHelper.hashData(password);
    const user = new this.userModel({
      ...dto,
      password: hashedPassword,
      role: [UserRoleEnum.STORE_OWNER],
      stores: [],
      store: null,
      emailVerified: false,
    });

    await user.save();

    const jwtService = new JwtService({});
    const accessToken = jwtService.sign(
      { _id: user._id.toString(), email: user.email, role: user.role },
      { secret: process.env.JWT_SECRET, expiresIn: '15m' },
    );
    const refreshToken = jwtService.sign(
      { _id: user._id.toString() },
      { secret: process.env.JWT_REFRESH_SECRET, expiresIn: '7d' },
    );

    user.refreshToken = refreshToken;
    await user.save();

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
}