import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";

enum DeliveryStatus {
      PENDING = 'PENDING',
      DELIVERED = 'DELIVERED',
      CANCELLED = 'CANCELLED',
}

export class CreateDeliveryDto {
      @ApiProperty({ description: 'The business name of the supplier' })
      @IsString()
      @IsNotEmpty()
      firstName: string;

      @ApiProperty({ description: 'The contact name of the supplier' })
      @IsString()
      @IsNotEmpty()
      lastName: string;

      @ApiProperty({ description: 'The email of the supplier' })
      @IsString()
      @IsNotEmpty()
      email: string;

      @ApiProperty({ description: 'The phone number of the supplier' })
      @IsString()
      phoneNumber: string;

      @ApiProperty({ description: 'The address of the supplier' })
      @IsString()
      @IsOptional()
      estate: string;

      @ApiProperty({ description: 'The country of the supplier' })
      @IsString()
      @IsNotEmpty()
      country: string;

      @ApiProperty({ description: 'The state of the supplier' })
      @IsString()
      state: string;

      @ApiProperty({ description: 'The area of the supplier' })
      @IsString()
      @IsNotEmpty()
      area: string;

      @ApiProperty({ description: 'The extra mobile number of the supplier' })
      @IsString()
      @IsOptional()
      extraPhone: string;

      @ApiProperty({ description: 'The business type of the supplier', required: false })
      @IsString()
      supplierType: string;

      @ApiProperty({ description: 'The local government area of the supplier' })
      @IsString()
      city: string;

      @ApiProperty({ description: 'Additional details of the supplier' })
      @IsString()
      @IsOptional()
      extraDetails: string;

      @IsString()
      @IsNotEmpty()
      orderId: string;

      @IsString()
      @IsNotEmpty()
      storeId: string;

      @IsArray()
      @IsNotEmpty()
      items: { productCode: string; quantity: number }[];

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




