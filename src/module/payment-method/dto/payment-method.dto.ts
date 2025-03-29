import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

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

  @IsString()
  @IsOptional()
  extraInfo?: string;
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

  @IsString()
  @IsOptional()
  extraInfo?: string;
}