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
      console.log("Registering user:", payload);
      const user = await this.userService.createUser(payload);
      console.log("User created:", user);
      await this.otpService.sendOTP({
        email: user.email,
        type: OtpTypeEnum.VERIFY_EMAIL,
        phone: user.phone,
      });
      return user;
    } catch (error) {
      console.error("Registration error:", error);
      if (error instanceof Error) {
        console.error("Error Message:", error.message);
        console.error("Error Stack:", error.stack);
      }
      throw new BadRequestException(error.message || 'Registration failed');
    }
  }


  async decodeToken(token: string) {
    const user = (await this.jwtService.verify(token)) as payload;
    if (!user) {
      throw new NotFoundException('User does not exist');
    }
    return user._id; // ✅ Correct field
  }


  async login(dto: LoginDto) {
    try {
      const user: UserDocument = await this.userService.getUserByEmailIncludePassword(dto.email);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      console.log('[login] Attempting login for:', dto.email);
      console.log('Entered Password:', dto.password);
      console.log('Stored Hashed Password:', user.password);

      const password = dto.password.trim(); // Trim password
      console.log('Trimmed Password:', password);

      const passwordMatch = await BaseHelper.compareHashedData(password, user.password);
      console.log('Password Match:', passwordMatch);

      if (!passwordMatch) {
        console.log("Password comparison failed.");
        throw new BadRequestException('Incorrect password');
      }

      // Generate JWT tokens
      const tokenPayload = { _id: user._id, email: user.email, isAdmin: user.isAdmin };


      const accessToken = this.jwtService.sign(tokenPayload, {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRATION_TIME,
      });

      const refreshToken = this.jwtService.sign(
        { _id: user._id },
        {
          secret: process.env.JWT_REFRESH_SECRET,
          expiresIn: process.env.JWT_REFRESH_EXPIRATION_TIME,
        }
      );

      console.log(`[login] Tokens generated for User ${user._id}:`);
      console.log(`  - Access Token: ${accessToken.substring(0, 20)}...`);
      console.log(`  - Refresh Token: ${refreshToken.substring(0, 20)}...`);

      const decodedToken = this.jwtService.decode(accessToken) as { exp: number };
      const expiresAt = decodedToken.exp;

      console.log(`[login] Login successful for User ${user._id}. Token expires at ${new Date(expiresAt * 1000)}`);

      await this.userService.saveRefreshToken(user._id.toString(), refreshToken);

      return {
        success: true,
        ...user.toObject(),
        accessToken,
        refreshToken,
      };
    } catch (err) {
      throw new BadRequestException(err.message || 'Login failed');
    }
  }


  async validateToken(token: string): Promise<UserDocument> {
    try {
      console.log(`[validateToken] Validating token: ${token.substring(0, 20)}...`);

      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });

      console.log(`[validateToken] Token decoded successfully:`, payload);

      const user = await this.userService.findById(payload._id);

      if (!user) {
        console.error('[validateToken] User not found for token:', token);
        throw new UnauthorizedException('Invalid token');
      }

      return user;
    } catch (e) {
      console.error('[validateToken] Token validation failed:', e.message);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  async refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    expiresAt: number;
  }> {
    try {
      console.log(`[refreshToken] Refreshing token: ${refreshToken.substring(0, 20)}...`);

      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      console.log('[refreshToken] Refresh token verified:', payload);

      const user = await this.userService.findById(payload._id);

      if (!user || user.refreshToken !== refreshToken) {
        console.warn(`[refreshToken] Invalid refresh token for user ${payload._id}`);
        throw new UnauthorizedException('Invalid refresh token');
      }

      const newAccessToken = this.jwtService.sign(
        { _id: user._id, isAdmin: user.isAdmin },
        {
          secret: process.env.JWT_SECRET,
          expiresIn: process.env.JWT_ACCESS_EXPIRATION_TIME,
        }
      );

      const decodedToken = this.jwtService.decode(newAccessToken) as { exp: number };
      const expiresAt = decodedToken.exp;

      console.log(`[refreshToken] New access token generated for User ${user._id}. Expires at: ${new Date(expiresAt * 1000)}`);

      return { accessToken: newAccessToken, expiresAt };
    } catch (e) {
      console.error('[refreshToken] Token refresh failed:', e.message);
      throw new UnauthorizedException('Failed to refresh token');
    }
  }


  async logout(token: string) {
    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException('Invalid token format');
    }

    console.log(`[logout] Token received: ${token}`);

    const user = await this.validateToken(token); // Check if token is valid
    if (!user) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    await this.userService.removeRefreshToken(user._id.toString());
    return { message: 'Logout successful' };
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

  async getUserByAccessToken(accessToken: string) {
    try {
      const user = await this.validateToken(accessToken);
      return {
        success: true,
        user: {
          _id: user._id,
          email: user.email,
          phone: user.phone,
          isAdmin: user.isAdmin,
        },
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
