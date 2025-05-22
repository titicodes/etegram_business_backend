import { Type } from 'class-transformer';
import { IsNotEmpty, IsArray, IsNumber, IsOptional, IsEnum, IsString, ValidateNested, Min } from 'class-validator';

export class ScanProductDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsArray()
  cart: { code: string; quantity: number }[];

  @IsString()
  @IsNotEmpty()
  storeId: string;
}


enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  TRANSFER = 'TRANSFER',
}

export class CreateCheckoutDto {
  @IsArray()
  @IsNotEmpty()
  cart: { code: string; quantity: number }[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tax?: number;

  @IsString()
  @IsNotEmpty()
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsString()
  @IsNotEmpty()
  storeId: string;
}


export class UpdateOrderStatusDto {
  @IsNotEmpty()
  @IsEnum(['Processing', 'Completed'])
  status: 'Processing' | 'Completed';
}


