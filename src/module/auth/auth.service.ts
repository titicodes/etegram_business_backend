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
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { User, UserDocument } from '../user/schema/user.schema';
import { LoginDto, VerifyEmailDto } from './dto/create-user.dto';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { ForgotPasswordDto, ResetPasswordDto } from '../otp/dto/otp.dto';
import { OtpService } from '../otp/otp.service';
import { BaseHelper } from '../../utils/helper.util';
import { OtpTypeEnum } from '../../common/constants/enums/otp.enum';
import { payload } from './interface/jwtSignPayload';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => OtpService))
    private readonly otpService: OtpService,
  ) {}

  async login(dto: LoginDto) {
    try {
      console.log('[AuthService][login] Attempting login for:', { email: dto.email });

      const user = await this.userService.getUserByEmailIncludePassword(dto.email);
      if (!user) {
        console.error('[AuthService][login] User not found:', { email: dto.email });
        throw new NotFoundException('User not found');
      }

      const passwordMatch = await BaseHelper.compareHashedData(dto.password.trim(), user.password);
      if (!passwordMatch) {
        console.error('[AuthService][login] Password mismatch for:', { email: dto.email });
        throw new BadRequestException('Incorrect password');
      }

      const tokenPayload: payload = {
        _id: user._id.toString(),
        email: user.email,
        role: user.role || [], // Include role from user, default to empty array if undefined
      };
      const accessToken = this.jwtService.sign(tokenPayload, {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRATION_TIME || '15m',
      });

      const refreshToken = this.jwtService.sign(
        { _id: user._id.toString() },
        {
          secret: process.env.JWT_REFRESH_SECRET,
          expiresIn: process.env.JWT_REFRESH_EXPIRATION_TIME || '7d',
        },
      );

      await this.userService.saveRefreshToken(user._id.toString(), refreshToken);

      console.log('[AuthService][login] Login successful:', {
        userId: user._id,
        email: user.email,
        role: user.role,
        accessToken: accessToken.substring(0, 20) + '...',
      });

      return {
        success: true,
        user: {
          _id: user._id,
          email: user.email,
          phone: user.phone,
          stores: user.stores,
          emailVerified: user.emailVerified,
          role: user.role,
        },
        accessToken,
        refreshToken,
      };
    } catch (error) {
      console.error('[AuthService][login] Login error:', error);
      throw new BadRequestException(error.message || 'Login failed');
    }
  }

  async register(payload: CreateUserDto) {
    try {
      console.log('[AuthService][register] Registering user:', { email: payload.email });
      const user = await this.userService.createUser(payload);
      console.log('[AuthService][register] User created:', { userId: user.customer._id, email: user.customer.email });

      await this.otpService.sendOTP({
        email: user.customer.email,
        type: OtpTypeEnum.VERIFY_EMAIL,
        phone: user.customer.phone,
      });

      return {
        success: true,
        user: {
          _id: user.customer._id,
          email: user.customer.email,
          phone: user.customer.phone,
          stores: user.customer.stores,
          emailVerified: user.customer.emailVerified,
          role: user.customer.role,
        },
        accessToken: user.accessToken,
        refreshToken: user.refreshToken,
      };
    } catch (error) {
      console.error('[AuthService][register] Registration error:', error);
      throw new BadRequestException(error.message || 'Registration failed');
    }
  }

  async validateToken(token: string): Promise<UserDocument> {
    try {
      console.log('[AuthService][validateToken] Validating token:', token.substring(0, 20) + '...');

      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      }) as payload;

      const user = await this.userService.findById(payload._id);
      if (!user) {
        console.error('[AuthService][validateToken] User not found:', { userId: payload._id });
        throw new UnauthorizedException('Invalid token: User not found');
      }

      console.log('[AuthService][validateToken] Token validated:', { userId: user._id, email: user.email });
      return user;
    } catch (error) {
      console.error('[AuthService][validateToken] Token validation failed:', error);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: number }> {
    try {
      console.log('[AuthService][refreshToken] Refreshing token:', refreshToken.substring(0, 20) + '...');

      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      }) as payload;

      const user = await this.userService.findById(payload._id);
      if (!user || user.refreshToken !== refreshToken) {
        console.error('[AuthService][refreshToken] Invalid refresh token:', { userId: payload._id });
        throw new UnauthorizedException('Invalid refresh token');
      }

      const newAccessToken = this.jwtService.sign(
        { _id: user._id.toString(), email: user.email, role: user.role || [] },
        {
          secret: process.env.JWT_SECRET,
          expiresIn: process.env.JWT_EXPIRATION_TIME || '15m',
        },
      );

      const decodedToken = this.jwtService.decode(newAccessToken) as { exp: number };
      const expiresAt = decodedToken.exp;

      console.log('[AuthService][refreshToken] New access token generated:', {
        userId: user._id,
        expiresAt: new Date(expiresAt * 1000),
      });

      return { accessToken: newAccessToken, expiresAt };
    } catch (error) {
      console.error('[AuthService][refreshToken] Refresh token error:', error);
      throw new UnauthorizedException('Failed to refresh token');
    }
  }

  async logout(token: string) {
    try {
      console.log('[AuthService][logout] Logging out with token:', token.substring(0, 20) + '...');

      const user = await this.validateToken(token);
      await this.userService.removeRefreshToken(user._id.toString());

      console.log('[AuthService][logout] Logout successful:', { userId: user._id });
      return { message: 'Logout successful' };
    } catch (error) {
      console.error('[AuthService][logout] Logout error:', error);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  async sendPasswordResetEmail(payload: ForgotPasswordDto) {
    try {
      await this.userService.checkUserExistByEmail(payload.email);
      await this.otpService.sendOTP({
        ...payload,
        type: OtpTypeEnum.RESET_PASSWORD,
      });
      console.log('[AuthService][sendPasswordResetEmail] Password reset OTP sent:', { email: payload.email });
    } catch (error) {
      console.error('[AuthService][sendPasswordResetEmail] Error:', error);
      throw new BadRequestException(error.message || 'Failed to send password reset email');
    }
  }

  async resetPassword(payload: ResetPasswordDto) {
    try {
      const { email, password, confirmPassword, code } = payload;

      if (password !== confirmPassword) {
        console.error('[AuthService][resetPassword] Passwords do not match:', { email });
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

      console.log('[AuthService][resetPassword] Password reset successful:', { email });
      return { message: 'Password reset successful' };
    } catch (error) {
      console.error('[AuthService][resetPassword] Error:', error);
      throw new BadRequestException(error.message || 'Failed to reset password');
    }
  }

  async verifyEmail(payload: VerifyEmailDto) {
    try {
      const { code, email } = payload;

      const user = await this.userService.getUserByEmail(email);
      if (!user) {
        console.error('[AuthService][verifyEmail] User not found:', { email });
        throw new BadRequestException('Invalid email');
      }

      if (user.emailVerified) {
        console.warn('[AuthService][verifyEmail] Email already verified:', { email });
        throw new UnprocessableEntityException('Email already verified');
      }

      await this.otpService.verifyOTP({
        code,
        email,
        type: OtpTypeEnum.VERIFY_EMAIL,
      });

      await this.userService.updateUserByEmail(email, {
        emailVerified: true,
      });

      console.log('[AuthService][verifyEmail] Email verified:', { email });
      return { message: 'Email verified successfully' };
    } catch (error) {
      console.error('[AuthService][verifyEmail] Error:', error);
      throw new BadRequestException(error.message || 'Failed to verify email');
    }
  }

  async getUserByAccessToken(accessToken: string) {
    try {
      console.log('[AuthService][getUserByAccessToken] Fetching user with token:', accessToken.substring(0, 20) + '...');

      const user = await this.validateToken(accessToken);
      if (!user) {
        console.error('[AuthService][getUserByAccessToken] User not found for token');
        throw new UnauthorizedException('Invalid or expired token');
      }

      console.log('[AuthService][getUserByAccessToken] User fetched:', { userId: user._id, email: user.email });

      return {
        success: true,
        user: {
          _id: user._id,
          email: user.email,
          phone: user.phone,
          stores: user.stores,
          emailVerified: user.emailVerified,
          role: user.role,
        },
      };
    } catch (error) {
      console.error('[AuthService][getUserByAccessToken] Error:', error);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}