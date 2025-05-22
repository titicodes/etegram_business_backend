import { IsString, IsOptional } from 'class-validator';

export class FilterProductDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  search?: string;
}