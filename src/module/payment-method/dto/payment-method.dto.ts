import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

enum PaymentMethodType {
  CASH = 'CASH',
  CARD = 'CARD',
  TRANSFER = 'TRANSFER',
}

export class CreatePaymentMethodDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  bank: string;

  @IsString()
  @IsNotEmpty()
  accountNumber: string;

  @IsString()
  @IsNotEmpty()
  accountName: string;

  // @IsString()
  // @IsOptional()
  // extraInfo?: string;

  @IsEnum(PaymentMethodType)
  @IsNotEmpty()
  type: PaymentMethodType;

  @IsString()
  @IsNotEmpty()
  storeId: string;

  @IsString()
  @IsOptional()
  details?: string;
}

export class UpdatePaymentMethodDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  bank?: string;

  @IsString()
  @IsOptional()
  accountNumber?: string;

  @IsString()
  @IsOptional()
  accountName?: string;

  // @IsString()
  // @IsOptional()
  // extraInfo?: string;

  @IsEnum(PaymentMethodType)
  @IsOptional()
  type?: PaymentMethodType;

  @IsString()
  @IsOptional()
  storeId?: string;

  @IsString()
  @IsOptional()
  details?: string;
}
