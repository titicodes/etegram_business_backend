import { IsString, IsOptional, IsArray, IsNumber, Min, IsEnum } from 'class-validator';

enum DeliveryStatus {
  PENDING = 'PENDING',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export class UpdateDeliveryDto {
  @IsString()
  @IsOptional()
  orderId?: string;

  @IsString()
  @IsOptional()
  storeId?: string;

  @IsArray()
  @IsOptional()
  items?: { productCode: string; quantity: number }[];

  @IsString()
  @IsOptional()
  supplierId?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsEnum(DeliveryStatus)
  @IsOptional()
  status?: DeliveryStatus;
}