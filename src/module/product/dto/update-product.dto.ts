// In your update-product.dto.ts
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Types } from 'mongoose';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsString()
  category?: string; // Expecting category name

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  expiryDate?: string;

  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @IsOptional()
  unitId?: Types.ObjectId;

  @IsOptional()
  @IsNumber()
  totalCost?: number;

  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsNumber()
  totalQuantity?: number;

  @IsOptional()
  @IsNumber()
  minQuantity?: number;

  @IsOptional()
  @IsString()
  supplyTo?: string;

  @IsOptional()
  @IsString()
  brands?: string; // Add brands to the DTO
}