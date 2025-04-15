import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsDateString } from "class-validator";

export class CustomerDto {
  @ApiProperty({ description: 'The business name of the supplier' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ description: 'The contact name of the supplier' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ description: 'The email of the supplier' })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'The phone number of the supplier' })
  @IsString()
  @IsOptional()
  phoneNumber: string;

  @ApiProperty({ description: 'The currency of the supplier' })
  @IsString()
  @IsOptional()
  currency: string;

  @ApiProperty({ description: 'The Date of birth details of the supplier' })
  @IsNotEmpty()
  @IsDateString() // Validates that the value is a valid ISO 8601 date string
  birthday: string;

  @ApiProperty({ description: 'The address of the supplier' })
  @IsString()
  @IsOptional()
  address: string;

  @ApiProperty({ description: 'The country of the supplier' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({ description: 'The state of the supplier' })
  @IsString()
  @IsOptional()
  state: string;

  @ApiProperty({ description: 'The area of the supplier' })
  @IsString()
  @IsNotEmpty()
  area: string;

  @ApiProperty({ description: 'The extra mobile number of the supplier' })
  @IsString()
  @IsOptional()
  extraPhone: string;

  @ApiProperty({ description: 'The business type of the supplier', required: false })
  @IsString()
  @IsOptional()
  supplierType: string;

  @ApiProperty({ description: 'The local government area of the supplier' })
  @IsString()
  @IsOptional()
  lga: string;

  @ApiProperty({ description: 'Additional details of the supplier' })
  @IsString()
  @IsOptional()
  extraDetails: string;
}
