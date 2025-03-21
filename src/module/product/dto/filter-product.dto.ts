import { IsOptional, IsString } from 'class-validator';

export class FilterProductDTO {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;
}
