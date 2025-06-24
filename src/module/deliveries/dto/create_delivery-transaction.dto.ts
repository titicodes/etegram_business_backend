import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsMongoId, IsArray, IsEnum, IsNumber } from 'class-validator';

enum DeliveryStatus {
  PENDING = 'PENDING',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  RECEIVED = 'RECEIVED',
}

export class CreateDeliveryTransactionDto {
  @ApiProperty({ description: 'The order ID' })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({ description: 'The store ID' })
  @IsMongoId()
  @IsNotEmpty()
  storeId: string;

  @ApiProperty({ description: 'The delivery agent ID' })
  @IsMongoId()
  @IsOptional()
  supplierId?: string;

  @ApiProperty({ description: 'List of items in the delivery' })
  @IsArray()
  @IsNotEmpty()
  items: { productCode: string; quantity: number }[];

  @ApiProperty({ description: 'Additional notes for the delivery' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ description: 'Status of the delivery', enum: DeliveryStatus })
  @IsEnum(DeliveryStatus)
  @IsOptional()
  status?: DeliveryStatus;
}