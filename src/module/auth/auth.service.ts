import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { UserService } from '../user/user.service';
import { UserRepository } from '../user/user.repository';
import { LoginDto, VerifyEmailDto } from './dto/create-user.dto';
import { User, UserDocument } from '../user/schema/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { CoreService } from 'src/common/constants/core/service.core';
import { payload } from './interface/jwtSignPayload';
import { BaseHelper } from 'src/utils/helper.util';
import { OtpTypeEnum } from 'src/common/constants/enums/otp.enum';
import { ForgotPasswordDto, ResetPasswordDto } from '../otp/dto/otp.dto';
import { OtpService } from '../otp/otp.service';
import { CreateUserDto } from '../user/dto/create-user.dto';

@Injectable()
export class AuthService extends CoreService<UserRepository> {
  constructor(
    private readonly userService: UserService,
    private readonly userRepository: UserRepository,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
    @Inject(forwardRef(() => OtpService))
    private readonly otpService: OtpService,
  ) {
    super(userRepository);
  }

  async register(payload: CreateUserDto) {
    try {
      // Ensure user doesn't already exist
      const existingUser = await this.userModel.findOne({
        $or: [{ email: payload.email }, { phone: payload.phone }],
      });

      if (existingUser) {
        throw new BadRequestException('Email or phone number already exists');
      }

      // Register user
      return await this.userService.createUser(payload);
    } catch (error) {
      if (error.code === 11000) {
        throw new BadRequestException('Duplicate entry detected');
      }
      throw new BadRequestException(error.message || 'Registration failed');
    }
  }

  async decodeToken(token: string) {
    const user = (await this.jwtService.verify(token)) as payload;
    if (!user) {
      throw new NotFoundException('User does not exist');
    }
    return user.id;
  }

  async login(payload: LoginDto) {
    const { email, password } = payload;

    const user: UserDocument =
      await this.userService.getUserByEmailIncludePassword(email);

    if (!user) {
      throw new BadRequestException('Invalid Credential');
    }

    console.log(`User emailVerified status: ${user.emailVerified}`);
    console.log(`Stored hashed password: ${user.password}`);

    const passwordMatch = await BaseHelper.compareHashedData(
      password,
      user.password,
    );

    if (!passwordMatch) {
      throw new BadRequestException('Incorrect Password');
    }

    if (!user.emailVerified) {
      throw new BadRequestException('Kindly verify your email to login');
    }

    // Create the token payload with isAdmin flag
    const tokenPayload = { _id: user._id, isAdmin: user.isAdmin };

    const accessToken = this.jwtService.sign(tokenPayload);
    const refreshToken = this.jwtService.sign(
      { _id: user._id },
      {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: process.env.JWT_REFRESH_EXPIRATION_TIME,
      },
    );

    await this.userService.saveRefreshToken(user._id.toString(), refreshToken);

    delete user['_doc'].password;
    return {
      ...user['_doc'],
      accessToken,
      refreshToken,
    };
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      const user: UserDocument = await this.userService.getUserByEmail(
        payload.email,
      );

      if (!user || user.refreshToken !== refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const newAccessToken = this.jwtService.sign(
        { _id: user._id },
        {
          secret: process.env.JWT_ACCESS_SECRET,
          expiresIn: process.env.JWT_ACCESS_EXPIRATION_TIME,
        },
      );

      return { accessToken: newAccessToken };
    } catch (e) {
      throw new UnauthorizedException('Failed to refresh token');
    }
  }

  async logout(userId: string) {
    await this.userService.removeRefreshToken(userId);
  }

  async sendPasswordResetEmail(payload: ForgotPasswordDto) {
    await this.userService.checkUserExistByEmail(payload.email);

    await this.otpService.sendOTP({
      ...payload,
      type: OtpTypeEnum.RESET_PASSWORD,
    });
  }

  async resetPassword(payload: ResetPasswordDto) {
    const { email, password, confirmPassword, code } = payload;

    if (password !== confirmPassword) {
      throw new ConflictException('Passwords do not match');
    }

    await this.otpService.verifyOTP({
      email,
      code,
      type: OtpTypeEnum.RESET_PASSWORD,
    });

    const hashedPassword = await BaseHelper.hashData(password);

    await this.userService.updateUserByEmail(email, {
      password: hashedPassword,
    });
  }

  async verifyEmail(payload: VerifyEmailDto) {
    const { code, email } = payload;

    const user: UserDocument = await this.userService.getUserByEmail(email);

    if (!user) {
      throw new BadRequestException('Invalid Email');
    }

    if (user.emailVerified) {
      throw new UnprocessableEntityException('Email already verified');
    }

    await this.otpService.verifyOTP({
      code,
      email,
      type: OtpTypeEnum.VERIFY_EMAIL,
    });

    await this.userService.updateUserByEmail(email, {
      emailVerified: true,
      //wallet: user.wallet + 100,
    });
  }
}
