import { IsString, IsNotEmpty, MinLength, IsEmail } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string; // Reset token sent via email

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  newPassword: string; // New password

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  confirmPassword: string; // Confirm new password
}



export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  oldPassword: string; // User's current password

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  newPassword: string; // New password

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  confirmPassword: string; // Confirm new password
}


export class ForgotPasswordDto {
    @IsEmail()
    @IsString()
    @IsNotEmpty()
    email: string; // Email to send reset link
  }