import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsMongoId,
  IsEmail,
  Matches,
} from 'class-validator';

export class UpdateDeliveryDto {
  @ApiProperty({ description: 'The first name of the delivery agent' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({ description: 'The last name of the delivery agent' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({ description: 'The email of the delivery agent' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ description: 'The phone number of the delivery agent' })
  @IsString()
  @IsOptional()
  @Matches(/^0\d{10}$/, {
    message: 'Phone number must be an 11-digit Nigerian number starting with 0',
  })
  phoneNumber?: string;

  @ApiProperty({ description: 'The extra phone number of the delivery agent' })
  @IsString()
  @IsOptional()
  @Matches(/^0\d{10}$/, {
    message:
      'Extra phone number must be an 11-digit Nigerian number starting with 0',
  })
  extraPhone?: string;

  @ApiProperty({ description: 'The estate of the delivery agent' })
  @IsString()
  @IsOptional()
  estate?: string;

  @ApiProperty({ description: 'The country of the delivery agent' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty({ description: 'The state of the delivery agent' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiProperty({
    description: 'The local government area (city) of the delivery agent',
  })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({ description: 'The area (ward) of the delivery agent' })
  @IsString()
  @IsOptional()
  area?: string;

  @ApiProperty({ description: 'The supplier type of the delivery agent' })
  @IsString()
  @IsOptional()
  supplierType?: string;

  @ApiProperty({ description: 'Additional details of the delivery agent' })
  @IsString()
  @IsOptional()
  extraDetails?: string;

  @ApiProperty({ description: 'The store ID' })
  @IsMongoId()
  @IsOptional()
  storeId?: string;

  @ApiProperty({ description: 'Status of the delivery agent' })
  @IsString()
  @IsOptional()
  status?: string;
}
