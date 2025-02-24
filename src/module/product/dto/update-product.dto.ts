import { IsString, IsOptional, IsNumber } from "class-validator";

export class UpdateProductDto {
    @IsString()
    @IsOptional()
    name?: string;
  
    @IsString()
    @IsOptional()
    code?: string;
  
    @IsNumber()
    @IsOptional()
    quantity?: number;
  
    @IsString()
    @IsOptional()
    image?: string;
  
    @IsNumber()
    @IsOptional()
    price?: number;
  
    @IsNumber()
    @IsOptional()
    categoryId?: number;
  
    @IsNumber()
    @IsOptional()
    unitId?: number;
  }