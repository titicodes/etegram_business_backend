import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsMongoId, IsEmail, Matches } from 'class-validator';

export class CreateDeliveryDto {
  @ApiProperty({ description: 'The first name of the delivery agent' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ description: 'The last name of the delivery agent' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ description: 'The email of the delivery agent' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'The phone number of the delivery agent' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^0\d{10}$/, { message: 'Phone number must be an 11-digit Nigerian number starting with 0' })
  phoneNumber: string;

  @ApiProperty({ description: 'The extra phone number of the delivery agent' })
  @IsString()
  @IsOptional()
  @Matches(/^0\d{10}$/, { message: 'Extra phone number must be an 11-digit Nigerian number starting with 0' })
  extraPhone?: string;

  @ApiProperty({ description: 'The estate of the delivery agent' })
  @IsString()
  @IsNotEmpty()
  estate: string;

  @ApiProperty({ description: 'The country of the delivery agent' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({ description: 'The state of the delivery agent' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ description: 'The local government area (city) of the delivery agent' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ description: 'The area (ward) of the delivery agent' })
  @IsString()
  @IsNotEmpty()
  area: string;

  @ApiProperty({ description: 'The supplier type of the delivery agent' })
  @IsString()
  @IsNotEmpty()
  supplierType: string;

  @ApiProperty({ description: 'Additional details of the delivery agent' })
  @IsString()
  @IsOptional()
  extraDetails?: string;

  @ApiProperty({ description: 'The store ID' })
  @IsMongoId()
  @IsNotEmpty()
  storeId: string;
}