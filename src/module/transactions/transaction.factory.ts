import { Injectable } from '@nestjs/common';
import { CreateTransactionDto } from './dto/transactions.dto';

@Injectable()
export class TransactionFactory {
  async create(data: CreateTransactionDto) {
    const payload: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      payload.key = value;
    }
  }
}
