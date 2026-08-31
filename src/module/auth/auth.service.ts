import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
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
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => OtpService))
    private readonly otpService: OtpService,
  ) {}

  async login(dto: LoginDto) {
    this.logger.log('[AuthService][login] Attempting login for:', {
      email: dto.email,
    });

    const user = await this.userService.getUserByEmailIncludePassword(
      dto.email,
    );
    if (!user) {
      this.logger.error('[AuthService][login] User not found:', {
        email: dto.email,
      });
      throw new NotFoundException('User not found'); // HTTP 404
    }

    const passwordMatch = await BaseHelper.compareHashedData(
      dto.password.trim(),
      user.password,
    );
    if (!passwordMatch) {
      this.logger.error('[AuthService][login] Password mismatch for:', {
        email: dto.email,
      });
      throw new UnauthorizedException('Incorrect password'); // HTTP 401
    }

    if (!user.emailVerified) {
      this.logger.warn('[AuthService][login] Email not verified:', {
        email: dto.email,
      });
      throw new UnauthorizedException('Email not verified'); // HTTP 401
    }

    const tokenPayload: payload = {
      _id: user._id.toString(),
      email: user.email,
      role: user.role || [],
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

    this.logger.log('[AuthService][login] Login successful:', {
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
        phoneNumber: user.phoneNumber,
        stores: user.stores,
        emailVerified: user.emailVerified,
        role: user.role,
      },
      accessToken,
      refreshToken,
    };
  }

  // auth.service.ts
  async register(payload: CreateUserDto) {
    this.logger.log('[AuthService][register] Registering user:', {
      email: payload.email,
    });
    let existingUser: UserDocument | null = null;
    try {
      existingUser = await this.userService.getUserByEmail(payload.email);
    } catch (error) {
      if (error instanceof NotFoundException) {
        this.logger.log(
          '[AuthService][register] No existing user found, proceeding to create:',
          { email: payload.email },
        );
      } else {
        this.logger.error(
          '[AuthService][register] Unexpected error checking user:',
          { error: error.message },
        );
        throw error;
      }
    }
    if (existingUser) {
      this.logger.error('[AuthService][register] User already exists:', {
        email: payload.email,
      });
      throw new ConflictException(
        `User with email ${payload.email} already exists`,
      );
    }
    this.logger.log('[AuthService][register] Creating new user');
    const user = await this.userService.createUser(payload);
    this.logger.log('[AuthService][register] User created:', {
      userId: user.customer._id,
      email: user.customer.email,
    });

    await this.otpService.sendOTP({
      email: user.customer.email,
      type: OtpTypeEnum.VERIFY_EMAIL,
      phone: user.customer.phoneNumber,
    });

    return {
      success: true,
      user: {
        _id: user.customer._id,
        email: user.customer.email,
        phoneNumber: user.customer.phoneNumber,
        stores: user.customer.stores,
        emailVerified: user.customer.emailVerified,
        role: user.customer.role,
      },
      accessToken: user.accessToken,
      refreshToken: user.refreshToken,
    };
  }

  async validateToken(token: string): Promise<UserDocument> {
    try {
      this.logger.log(
        '[AuthService][validateToken] Validating token:',
        token.substring(0, 20) + '...',
      );

      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      }) as payload;

      const user = await this.userService.findById(payload._id);
      if (!user) {
        this.logger.error('[AuthService][validateToken] User not found:', {
          userId: payload._id,
        });
        throw new UnauthorizedException('Invalid token: User not found');
      }

      this.logger.log('[AuthService][validateToken] Token validated:', {
        userId: user._id,
        email: user.email,
      });
      return user;
    } catch (error) {
      this.logger.error(
        '[AuthService][validateToken] Token validation failed:',
        error,
      );
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  async refreshToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; expiresAt: number }> {
    try {
      this.logger.log(
        '[AuthService][refreshToken] Refreshing token:',
        refreshToken.substring(0, 20) + '...',
      );

      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      }) as payload;

      const user = await this.userService.findById(payload._id);
      if (!user || user.refreshToken !== refreshToken) {
        this.logger.error(
          '[AuthService][refreshToken] Invalid refresh token:',
          { userId: payload._id },
        );
        throw new UnauthorizedException('Invalid refresh token');
      }

      const newAccessToken = this.jwtService.sign(
        { _id: user._id.toString(), email: user.email, role: user.role || [] },
        {
          secret: process.env.JWT_SECRET,
          expiresIn: process.env.JWT_EXPIRATION_TIME || '15m',
        },
      );

      const decodedToken = this.jwtService.decode(newAccessToken) as {
        exp: number;
      };
      const expiresAt = decodedToken.exp;

      this.logger.log(
        '[AuthService][refreshToken] New access token generated:',
        {
          userId: user._id,
          expiresAt: new Date(expiresAt * 1000),
        },
      );

      return { accessToken: newAccessToken, expiresAt };
    } catch (error) {
      this.logger.error(
        '[AuthService][refreshToken] Refresh token error:',
        error,
      );
      throw new UnauthorizedException('Failed to refresh token');
    }
  }

  async logout(token: string) {
    try {
      this.logger.log(
        '[AuthService][logout] Logging out with token:',
        token.substring(0, 20) + '...',
      );

      const user = await this.validateToken(token);
      await this.userService.removeRefreshToken(user._id.toString());

      this.logger.log('[AuthService][logout] Logout successful:', {
        userId: user._id,
      });
      return { message: 'Logout successful' };
    } catch (error) {
      this.logger.error('[AuthService][logout] Logout error:', error);
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
      this.logger.log(
        '[AuthService][sendPasswordResetEmail] Password reset OTP sent:',
        { email: payload.email },
      );
      return { message: 'Password reset OTP sent successfully' };
    } catch (error) {
      this.logger.error('[AuthService][sendPasswordResetEmail] Error:', error);
      throw new BadRequestException(
        error.message || 'Failed to send password reset email',
      );
    }
  }

  async resetPassword(payload: ResetPasswordDto) {
    try {
      const { email, password, confirmPassword, code } = payload;

      if (password !== confirmPassword) {
        this.logger.error(
          '[AuthService][resetPassword] Passwords do not match:',
          { email },
        );
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

      this.logger.log(
        '[AuthService][resetPassword] Password reset successful:',
        { email },
      );
      return { message: 'Password reset successful' };
    } catch (error) {
      this.logger.error('[AuthService][resetPassword] Error:', error);
      throw new BadRequestException(
        error.message || 'Failed to reset password',
      );
    }
  }

  async verifyEmail(payload: VerifyEmailDto) {
    try {
      const { code, email } = payload;

      const user = await this.userService.getUserByEmail(email);
      if (!user) {
        this.logger.error('[AuthService][verifyEmail] User not found:', {
          email,
        });
        throw new NotFoundException('User not found');
      }

      if (user.emailVerified) {
        this.logger.warn('[AuthService][verifyEmail] Email already verified:', {
          email,
        });
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

      this.logger.log('[AuthService][verifyEmail] Email verified:', { email });
      return { message: 'Email verified successfully' };
    } catch (error) {
      this.logger.error('[AuthService][verifyEmail] Error:', error);
      throw new BadRequestException(error.message || 'Failed to verify email');
    }
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ) {
    try {
      this.logger.log(
        '[AuthService][changePassword] Attempting to change password for user:',
        { userId },
      );

      const user = await this.userService.getUserByIdIncludePassword(userId);
      if (!user) {
        this.logger.error('[AuthService][changePassword] User not found:', {
          userId,
        });
        throw new NotFoundException('User not found');
      }

      const passwordMatch = await BaseHelper.compareHashedData(
        oldPassword,
        user.password,
      );
      if (!passwordMatch) {
        this.logger.error(
          '[AuthService][changePassword] Incorrect old password:',
          { userId },
        );
        throw new UnauthorizedException('Incorrect old password');
      }

      const passwordRegex =
        /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
      if (!passwordRegex.test(newPassword)) {
        this.logger.error(
          '[AuthService][changePassword] New password does not meet requirements:',
          { userId },
        );
        throw new BadRequestException(
          'New password must be at least 8 characters, include a capital letter, a number, and a special character',
        );
      }

      const hashedNewPassword = await BaseHelper.hashData(newPassword);
      await this.userService.updateUserById(userId, {
        password: hashedNewPassword,
      });

      this.logger.log(
        '[AuthService][changePassword] Password changed successfully:',
        { userId },
      );
      return { message: 'Password changed successfully' };
    } catch (error) {
      this.logger.error('[AuthService][changePassword] Error:', error);
      throw new BadRequestException(
        error.message || 'Failed to change password',
      );
    }
  }

  async getUserByAccessToken(accessToken: string) {
    try {
      this.logger.log(
        '[AuthService][getUserByAccessToken] Fetching user with token:',
        accessToken.substring(0, 20) + '...',
      );

      const user = await this.validateToken(accessToken);
      if (!user) {
        this.logger.error(
          '[AuthService][getUserByAccessToken] User not found for token',
        );
        throw new UnauthorizedException('Invalid or expired token');
      }

      this.logger.log('[AuthService][getUserByAccessToken] User fetched:', {
        userId: user._id,
        email: user.email,
      });

      return {
        success: true,
        user: {
          _id: user._id,
          email: user.email,
          phoneNumber: user.phoneNumber,
          stores: user.stores,
          emailVerified: user.emailVerified,
          role: user.role,
        },
      };
    } catch (error) {
      this.logger.error('[AuthService][getUserByAccessToken] Error:', error);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  async resendOtp(email: string) {
    try {
      this.logger.log('[AuthService][resendOtp] Resending OTP for:', { email });

      const user = await this.userService.getUserByEmail(email);
      if (!user) {
        this.logger.error('[AuthService][resendOtp] User not found:', {
          email,
        });
        throw new NotFoundException('User not found');
      }

      if (user.emailVerified) {
        this.logger.warn('[AuthService][resendOtp] Email already verified:', {
          email,
        });
        throw new UnprocessableEntityException('Email already verified');
      }

      await this.otpService.sendOTP({
        email,
        type: OtpTypeEnum.VERIFY_EMAIL,
        phone: user.phoneNumber,
      });

      this.logger.log('[AuthService][resendOtp] OTP resent successfully:', {
        email,
      });
      return { message: 'OTP resent successfully' };
    } catch (error) {
      this.logger.error('[AuthService][resendOtp] Error:', error);
      throw new BadRequestException(error.message || 'Failed to resend OTP');
    }
  }
}
