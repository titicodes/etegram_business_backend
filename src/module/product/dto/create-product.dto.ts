// // In your create-product.dto.ts
// import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
// import { Types } from 'mongoose';

// export class CreateProductDto {
//   @IsNotEmpty()
//   @IsString()
//   code: string;

//   @IsNotEmpty()
//   @IsString()
//   name: string;

//   @IsOptional()
//   @IsString()
//   description?: string;

//   @IsNotEmpty()
//   @IsNumber()
//   price: number;

//   @IsNotEmpty()
//   @IsString()
//   category: string; // Now expecting category name

//   @IsNotEmpty()
//   @IsNumber()
//   quantity: number;

//   @IsNotEmpty()
//   @IsNumber()
//   stock: number;

//   @IsOptional()
//   @IsString()
//   image?: string;

//   // @IsOptional()
//   // @IsString()
//   // expiryDate?: string;

//   @IsOptional()
//   @IsNumber()
//   unitPrice?: number;

//   @IsNotEmpty()
//   unitId: Types.ObjectId;

//   @IsOptional()
//   @IsNumber()
//   totalCost?: number;

//   @IsOptional()
//   @IsString()
//   size?: string;

//   @IsOptional()
//   @IsNumber()
//   totalQuantity?: number;

//   @IsOptional()
//   @IsNumber()
//   minQuantity?: number;

//   @IsOptional()
//   @IsString()
//   supplyTo?: string;

//   @IsNotEmpty()
//   @IsString()
//   store: string;

//   expiryDate?: Date;

//   brands?: string[];
// }


import { IsString, IsNumber, IsOptional, IsNotEmpty, Min, IsDateString } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString({ each: true })
  brands?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  //   @IsNotEmpty()
  // @IsNumber()
  // stock: number;
}