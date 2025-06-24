import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
  IsEnum,
  IsDateString,
} from 'class-validator';

enum ExpenseCategory {
  UTILITIES = 'UTILITIES',
  SUPPLIES = 'SUPPLIES',
  SALARIES = 'SALARIES',
  OTHER = 'OTHER',
}

export class CreateExpenseDto {
  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @IsNotEmpty()
  storeId: string;

  @IsEnum(ExpenseCategory)
  @IsOptional()
  category?: ExpenseCategory;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsDateString() // <-- Validates ISO 8601 date strings
  @IsOptional()
  date?: string;
}


export class UpdateExpenseDto {
  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  storeId?: string;

  @IsEnum(ExpenseCategory)
  @IsOptional()
  category?: ExpenseCategory;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsDateString() // Optional and properly validated
  @IsOptional()
  date?: string;
}
