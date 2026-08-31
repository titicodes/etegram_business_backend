// src/product/dto/filter-product.dto.ts
import { IsOptional, IsString, IsMongoId } from 'class-validator';

export class FilterProductDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsMongoId()
  category?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}
