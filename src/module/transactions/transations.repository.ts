import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, QueryOptions, UpdateQuery } from 'mongoose';
import { PaginationDto } from './dto/pagination.dto';
import { CoreRepository } from 'src/common/constants/core/repository';
import {
  TransactionDocument,
  Transactions,
} from './schema/transactions.schema';

@Injectable()
export class TransactionRepository extends CoreRepository<TransactionDocument> {
  constructor(
    @InjectModel(Transactions.name)
    private readonly transactionModel: Model<TransactionDocument>,
  ) {
    super(transactionModel);
  }

  async createMany(
    data: Partial<TransactionDocument>[],
  ): Promise<TransactionDocument[]> {
    return this.transactionModel.insertMany(data) as unknown as Promise<
      TransactionDocument[]
    >;
  }

  async findOne(
    entityFilterQuery: FilterQuery<TransactionDocument>,
    projection?: Record<string, unknown>,
    options?: QueryOptions,
  ): Promise<TransactionDocument> {
    return this.transactionModel
      .findOne(entityFilterQuery, projection, options)
      .exec();
  }

  async find(
    entityFilterQuery: FilterQuery<TransactionDocument>,
    projection?: Record<string, unknown>,
    options?: QueryOptions,
  ): Promise<TransactionDocument[]> {
    return this.transactionModel
      .find(entityFilterQuery, projection, options)
      .exec();
  }

  async findOneAndUpdate(
    filter: FilterQuery<TransactionDocument>,
    update: UpdateQuery<TransactionDocument>,
    options?: QueryOptions,
  ): Promise<TransactionDocument | null> {
    return this.transactionModel
      .findOneAndUpdate(filter, update, options)
      .exec();
  }

  async deleteOne(
    filterQuery: FilterQuery<TransactionDocument>,
  ): Promise<{ deletedCount: number }> {
    const result = await this.transactionModel.deleteOne(filterQuery).exec();
    return { deletedCount: result.deletedCount || 0 };
  }

  async deleteMany(
    filterQuery: FilterQuery<TransactionDocument>,
  ): Promise<{ deletedCount: number }> {
    const result = await this.transactionModel.deleteMany(filterQuery).exec();
    return { deletedCount: result.deletedCount || 0 };
  }

  async countDocuments(
    filterQuery: FilterQuery<TransactionDocument>,
  ): Promise<number> {
    return this.transactionModel.countDocuments(filterQuery).exec();
  }

  newDocument(data: any): TransactionDocument {
    return new this.transactionModel(data);
  }

  async save(document: TransactionDocument): Promise<TransactionDocument> {
    return document.save();
  }

  model(): Model<TransactionDocument> {
    return this.transactionModel;
  }

  async updateTransaction(
    filter: FilterQuery<TransactionDocument>,
    update: UpdateQuery<TransactionDocument>,
    options?: QueryOptions,
  ): Promise<TransactionDocument | null> {
    return this.transactionModel
      .findOneAndUpdate(filter, update, options)
      .exec();
  }

  // ✅ Added Pagination Support
  async paginate(
    query: PaginationDto,
    options?: FilterQuery<TransactionDocument>,
  ) {
    const { page = 1, size = 10 } = query;
    const skip = (page - 1) * size;

    const [data, total] = await Promise.all([
      this.transactionModel
        .find(options)
        .skip(skip)
        .limit(size > 100 ? 100 : size)
        .sort({ createdAt: -1 }) // Sort by latest transaction
        .exec(),
      this.transactionModel.countDocuments(options),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        size,
        lastPage: Math.ceil(total / size),
      },
    };
  }
}
