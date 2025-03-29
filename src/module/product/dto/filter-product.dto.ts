import { IsOptional, IsMongoId, IsString } from 'class-validator';

export class FilterProductDTO {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsMongoId() // ✅ Ensures it's a valid ObjectId
  category?: string;

  @IsOptional()
  @IsMongoId() // ✅ Ensures it's a valid ObjectId
  unitId?: string;
}
