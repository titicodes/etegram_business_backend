import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CoreSearchFilterDatePaginationDto } from 'src/common/constants/core/dto.core';
import { TransactionStatus, TransactionType } from '../enums/transaction.enum';

export class ViewTransactionDto extends CoreSearchFilterDatePaginationDto {
  @ApiProperty()
  @IsEnum(TransactionStatus)
  @IsOptional()
  status: TransactionStatus;

  @ApiProperty()
  @IsEnum(TransactionType)
  @IsOptional()
  type: TransactionType;
}

export class AbstractPaginationDto {
  @ApiProperty()
  @IsOptional()
  page: number = 1;

  @ApiProperty()
  @IsOptional()
  limit: number = 10;
}
