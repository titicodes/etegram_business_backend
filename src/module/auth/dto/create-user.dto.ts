import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator';
// export class CreateUserDto {
//   @ApiProperty()
//   @IsString()
//   @IsNotEmpty()
//   email: string;

//   @ApiProperty()
//   @IsString()
//   @IsNotEmpty()
//   password: string;

//   @ApiProperty()
//   @IsString()
//   @IsNotEmpty()
//   firstName: string;

//   @ApiProperty()
//   @IsString()
//   @IsNotEmpty()
//   lastName: string;

//   @ApiProperty()
//   @IsString()
//   @IsNotEmpty()
//   phone: string;
// }

export class LoginDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class ForgetPasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  email: string;
}

export class VerifyEmailDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  code: number;
}
