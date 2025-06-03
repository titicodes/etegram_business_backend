import { Exclude } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional, IsEmail, IsMongoId } from 'class-validator';

export class CreateStoreDto {
  @Exclude()
  _id?: string;

  @Exclude()
  owner?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  classification: string;

  @IsString()
  @IsNotEmpty()
  country: string;

  @IsString()
  @IsNotEmpty()
  state: string;

  @IsString()
  @IsNotEmpty()
  lga: string;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  area?: string;

  @IsMongoId()
  @IsOptional()
  parentStore?: string;
}