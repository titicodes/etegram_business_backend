import { PartialType } from '@nestjs/mapped-types';
import { CreateSupplyDto } from "./supply.dto";

export class UpdateSupplierDto extends PartialType(CreateSupplyDto) {}

// import { IsString, IsOptional, IsEmail } from 'class-validator';

// export class UpdateSupplyDto {
//   @IsString()
//   @IsOptional()
//   businessName?: string;

//   @IsEmail()
//   @IsOptional()
//   email?: string;

//   @IsString()
//   @IsOptional()
//   phoneNumber?: string;

//   @IsString()
//   @IsOptional()
//   storeId?: string;

//   @IsString()
//   @IsOptional()
//   address?: string;
// }