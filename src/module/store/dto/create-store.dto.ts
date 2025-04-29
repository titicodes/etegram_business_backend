import { IsString } from "class-validator";

export class CreateStoreDto {
  @IsString()
  name: string;

  @IsString()
  type: string;

  @IsString()
  classification: string;

  @IsString()
  country: string;

  @IsString()
  state: string;

  @IsString()
  lga: string;

  @IsString()
  currency: string;

  @IsString()
  owner: string; // User ID
}

