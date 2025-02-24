import { IsEnum, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateTransactionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(['debit', 'credit'])
  type: 'debit' | 'credit';

  @IsNumber()
  amount: number;

  @IsString()
  @IsNotEmpty()
  paymentMethod: string;

  @IsNotEmpty()
  date: Date;
}
