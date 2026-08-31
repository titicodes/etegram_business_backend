import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateSupplyDto {
  @ApiProperty({ description: 'The business name of the supplier' })
  @IsString()
  @IsNotEmpty()
  businessName: string;

  @ApiProperty({ description: 'The contact name of the supplier' })
  @IsString()
  @IsNotEmpty()
  contactName: string;

  @ApiProperty({ description: 'The email of the supplier' })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'The phone number of the supplier' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({ description: 'The currency of the supplier' })
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiProperty({ description: 'The account details of the supplier' })
  @IsString()
  @IsNotEmpty()
  accountDetails: string;

  @ApiProperty({ description: 'The address of the supplier' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ description: 'The country of the supplier' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({ description: 'The state of the supplier' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ description: 'The local government area of the supplier' })
  @IsString()
  @IsNotEmpty()
  lga: string;

  @ApiProperty({ description: 'The area of the supplier' })
  @IsString() // Change to IsNumber() if area should be numeric
  @IsNotEmpty()
  area: string;

  @ApiProperty({
    description: 'The business type of the supplier',
    required: false,
  })
  @IsString()
  @IsOptional()
  supplierType?: string;

  @ApiProperty({
    description: 'The extra mobile number of the supplier',
    required: false,
  })
  @IsString()
  @IsOptional()
  extraMobile?: string;

  @IsString()
  @IsNotEmpty()
  storeId: string;
}
