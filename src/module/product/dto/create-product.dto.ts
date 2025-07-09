
import { IsString, IsNumber, IsOptional, IsNotEmpty, Min, IsDateString } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString({ each: true })
  brands?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @IsOptional()
  @IsString()
  size?: string;

  @IsString()
  @IsNotEmpty() // Make storeId required for product creation
  storeId: string

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsOptional()
  @IsNumber()
  unitPrice?: number;
}