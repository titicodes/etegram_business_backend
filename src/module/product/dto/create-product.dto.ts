import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @IsString()
  @IsOptional()
  image?: string;

  @IsNumber()
  @IsNotEmpty()
  price: number;

  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsNumber()
  @IsNotEmpty()
  unitId: number;

  @IsNumber()
  @IsOptional()
  stock: number

  @IsString()
  @IsOptional()
  category:string
  @IsString()
  name: string;

  @IsString()
  size: string;

  @IsInt()
  totalQuantity: number;

  @IsInt()
  totalCost: number;

  @IsInt()
  unitPrice: number;

  @IsInt()
  minQuantity: number;

  @IsString()
  expiryDate: string;

  @IsOptional()
  @IsString()
  supplyTo?: string;
}
