import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsNumber, IsNumberString, IsOptional, IsPhoneNumber, IsString } from 'class-validator';
import { OtpTypeEnum } from 'src/common/enums/otp.enum';

export class CreateOtpDto {
  @IsEnum(OtpTypeEnum)
  type: OtpTypeEnum;

  @IsEmail()
  email: string;

  @IsNumberString() // Change from IsNumber() to IsNumberString() to accept numeric strings
  code: number; // Change type to string for flexibility
}

export class SendOtpDto {
  @IsEnum(OtpTypeEnum)
  type: OtpTypeEnum;

  @IsEmail()
  email: string;

  @IsPhoneNumber('NG') // Specify country code (e.g., 'NG' for Nigeria) for better validation
  @IsOptional()
  phone?: string; // Mark as optional and handle it properly
}

export class VerifyOtpDto extends SendOtpDto {
  @IsNumberString() // Again, use IsNumberString() for string-based OTPs
  code: number;
}

export class ValidateOtpDto extends VerifyOtpDto {}


export class LoginDto {
  @ApiProperty({ description: 'The referral code of the customer', required: true })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'The referral code of the customer', required: true })
  @IsString()
  password: string;
}

export class VerifyEmailDto {
  @ApiProperty({ description: 'The verification email code of the customer', required: true })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'The otp code of the customer', required: true })
  @IsNumber()
  code: number;
}

export class RequestVerifyEmailOtpDto {
  @ApiProperty({ description: 'The referral code of the customer', required: true })
  @IsEmail()
  email: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ description: 'The email  of the customer', required: true })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto extends LoginDto {
  @ApiProperty({ description: 'The otp code of the customer', required: true })
  @IsNumber()
  code: number;

  @IsString()
  confirmPassword: string;
}

export class RefreshTokenDto {
  @IsNotEmpty()
  @IsString()
  refreshToken: string;
}

// src/auth/dto/auth.dto.ts
export class VerifyPhoneDto {
  @ApiProperty({ description: 'The phone number of the customer', required: true })
  @IsString()
  phone: string;

  @ApiProperty({ description: 'The otp code of the customer', required: true })
  @IsString()
  code: string;
}

export class RequestVerifyPhoneOtpDto {
  @ApiProperty({ description: 'The phone number of the customer', required: true })
  @IsString()
  phone: string;
}

