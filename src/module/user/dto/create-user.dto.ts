import {
  IsEmail,
  IsString,
  IsOptional,
  Length,
  MinLength,
  MaxLength,
  IsNotEmpty,
  IsCurrency,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { UserRoleEnum } from 'src/common/constants/enums/user.enum';

export class CreateUserDto {
  @ApiProperty({ description: 'The email of the user' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'The phone number of the user', required: false })
  @IsOptional()
  @IsString()
  @Length(10, 11)
  phone: string;

  @ApiProperty({ description: 'The password of the user' })
  @IsString()
  @MinLength(4)
  @MaxLength(20)
  password: string;

  @ApiProperty({ description: 'The first name of the user' })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  firstName: string;

  @ApiProperty({ description: 'The last name of the user' })
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  lastName: string;

  @ApiProperty({ description: 'The last name of the user' })
  @IsString()
  businessName : string;

  // @ApiProperty({
  //   enum: UserRoleEnum,
  //   description: 'The role of the user in the system',
  //   required: false,
  // })
  // @IsEnum(UserRoleEnum, { message: 'Role must be either ADMIN or USER' })
  // @IsOptional()
  // role?: UserRoleEnum;

  metadata?: { userId: string };

  @ApiProperty({ description: 'The country of the user' })
  @IsString()
  @IsNotEmpty()
  country: string; // e.g., "Nigeria"

  @ApiProperty({ description: 'The state of the user' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ description: 'The currency of the user' })
  @IsString()
  @IsNotEmpty()
  @IsString()
  currency: string;
  
  @ApiProperty({ description: 'The last area of the user' })
  @IsString()
  area: string;

  @ApiProperty({ description: 'The last city of the user' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ description: 'The business type of the user', required: false }) // Make it optional if needed
  @IsString()
  @IsOptional() // If business type is not always required
  businessType?: string; // e.g., "Retail", "Wholesale", "Services"
}