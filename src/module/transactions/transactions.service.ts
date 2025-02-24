import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RepositoryService } from '../repository/repository.service';
import {
  TransactionDocument,
  Transactions,
} from './schema/transactions.schema';
import { CreateTransactionDto } from './dto/transactions.dto';
import { PaginationDto } from './dto/pagination.dto';
import { TransactionRepository } from './transations.repository';
import { CoreService } from 'src/common/constants/core/service.core';
import { TransactionFactory } from './transaction.factory';
import { ViewTransactionDto } from './dto/view-transaction.dto';

@Injectable()
export class TransactionsService extends CoreService<TransactionRepository> {
  constructor(
    @InjectModel(Transactions.name)
    private transactionModel: Model<TransactionDocument>,
    private readonly transactionRepository: TransactionRepository,
    private readonly factory: TransactionFactory,
  ) {
    super(transactionRepository);
  }

  // async createTransaction(createTransactionDto: CreateTransactionDto) {
  //   return this.transactionRepository.create(createTransactionDto);
  // }
  async createTransaction(data: CreateTransactionDto) {
    const create = await this.factory.create(data);
    const newTransaction = await this.transactionRepository.create(create);
    return newTransaction;
  }

  async findAll(query: PaginationDto) {
    return this.transactionRepository.paginate(query);
  }

  async findOneById(id: string) {
    const transaction = await this.transactionRepository.findOne({ _id: id });
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }
    return transaction;
  }

  async delete(id: string) {
    const result = await this.transactionRepository.deleteOne({ _id: id });
    if (result.deletedCount === 0) {
      throw new NotFoundException('Transaction not found');
    }
    return { message: 'Transaction deleted successfully' };
  }

  async getTransaction(query: ViewTransactionDto) {
    let searchQuery: Record<string, any> = {};
    if (query.q) {
      searchQuery = {
        reference: { $regex: query.q, $options: 'i' },
      };
    }
    if (query.status) {
      searchQuery.status = query.status;
    }
    if (query.type) {
      searchQuery.type = query.type;
    }

    searchQuery = {
      ...searchQuery,
      ...(query.startDate &&
        !query.endDate && {
          createdAt: {
            $gte: new Date(query.startDate).toISOString(),
          },
        }),
      ...(!query.startDate &&
        query.endDate && {
          createdAt: {
            $lte: new Date(query.endDate).toISOString(),
          },
        }),
      ...(query.startDate &&
        query.endDate && {
          createdAt: {
            $lte: new Date(query.endDate).toISOString(),
            $gte: new Date(query.startDate).toISOString(),
          },
        }),
    };
    const { page, perPage } = query;
    const total = await this.transactionRepository
      .model()
      .find({
        ...searchQuery,
      })
      .sort({ _id: -1 })
      .skip(((+page || 1) - 1) * (+perPage || 10))
      .limit(+perPage || 10);

    return total;
  }
}
