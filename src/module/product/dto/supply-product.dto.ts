import { IsString, IsNumber, Min, IsNotEmpty } from 'class-validator';

export class SupplyProductDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsNumber()
  @Min(0)
  additionalQuantity: number;
}