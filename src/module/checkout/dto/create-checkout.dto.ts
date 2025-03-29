import { IsNotEmpty, IsArray, IsNumber, IsOptional, IsEnum, IsString } from 'class-validator';

export class ScanProductDto {
  @IsNotEmpty()
  code: string;

  @IsOptional()
  @IsArray()
  cart?: { code: string; quantity: number }[];
}


export class CreateCheckoutDto {
  @IsArray()
  @IsNotEmpty()
  cart: { code: string; quantity: number }[];

  @IsString()
  @IsNotEmpty()
  paymentMethod: string;  // <-- Add this field

  @IsOptional()
  @IsNumber()
  discount?: number;

  @IsOptional()
  @IsNumber()
  tax?: number;
}


export class UpdateOrderStatusDto {
  @IsNotEmpty()
  @IsEnum(['Processing', 'Completed'])
  status: 'Processing' | 'Completed';
}
