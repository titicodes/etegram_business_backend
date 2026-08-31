import {
  IsEmail,
  IsString,
  IsOptional,
  Length,
  MinLength,
  MaxLength,
  IsNotEmpty,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRoleEnum } from 'src/common/enums/user.enum';

export class CreateUserDto {
  @ApiProperty({ description: 'The email of the user' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'The phone number of the user', required: false })
  @IsOptional()
  @IsString()
  @Length(10, 11)
  phoneNumber?: string;

  @ApiProperty({ description: 'The password of the user' })
  @IsNotEmpty()
  @IsString()
  // @MinLength(8)
  // @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
  //   message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  // })
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
  @IsOptional()
  businessName: string;

  metadata?: { userId: string };

  @ApiProperty({ description: 'The country of the user' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty({ description: 'The state of the user' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiProperty({ description: 'The currency of the user' })
  @IsString()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ description: 'The last area of the user' })
  @IsOptional()
  area?: string;

  @ApiProperty({ description: 'The last city of the user' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({
    description: 'The business type of the user',
    required: false,
  })
  @IsOptional()
  businessType?: string;

  @IsEnum(UserRoleEnum, { each: true })
  @IsOptional()
  role?: UserRoleEnum[];
}
