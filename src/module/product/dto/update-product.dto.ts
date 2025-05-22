import { IsString, IsNumber, IsOptional, Min, IsDateString } from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

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
}