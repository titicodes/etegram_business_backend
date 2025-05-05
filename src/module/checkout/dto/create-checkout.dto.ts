import { Type } from 'class-transformer';
import { IsNotEmpty, IsArray, IsNumber, IsOptional, IsEnum, IsString, ValidateNested } from 'class-validator';

export class ScanProductDto {
  @IsNotEmpty()
  code: string;

  @IsOptional()
  @IsArray()
  cart?: { code: string; quantity: number }[];
}


export class CreateCheckoutDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  cart: CartItemDto[];

  @IsString()
  @IsNotEmpty()
  paymentMethod: string;

  @IsOptional()
  @IsNumber()
  discount?: number;

  @IsOptional()
  @IsNumber()
  tax?: number;

  @IsString()
  storeId: string;
}


export class UpdateOrderStatusDto {
  @IsNotEmpty()
  @IsEnum(['Processing', 'Completed'])
  status: 'Processing' | 'Completed';
}


class CartItemDto {
  @IsString()
  code: string;

  @IsNumber()
  quantity: number;
}