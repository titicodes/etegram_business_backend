import { FilterQuery, QueryOptions, UpdateQuery } from 'mongoose';
import { CoreRepository } from './repository';
import { Logger, NotFoundException } from '@nestjs/common';
import { Document } from 'mongoose';

export abstract class CoreService<T extends CoreRepository<any>, D = any> {
  // Added D for data type
  private readonly logger = new Logger(CoreService.name);

  constructor(protected readonly respository: T) {}

  async create(data: D): Promise<any> {
    // Use D for data type
    try {
      return await this.respository.create(data);
    } catch (error) {
      this.logger.error('Error creating document:', error);
      throw error;
    }
  }

  async findOne(
    entityFilterQuery: FilterQuery<T>,
    projection?: Record<string, unknown>,
    options?: QueryOptions,
  ): Promise<any | null> {
    // Explicit return type
    try {
      return await this.respository.findOne(
        entityFilterQuery,
        projection,
        options,
      );
    } catch (error) {
      this.logger.error('Error finding document:', error);
      return null;
    }
  }

  async find(
    entityFilterQuery: FilterQuery<T>,
    projection?: Record<string, unknown>,
    options?: QueryOptions,
  ): Promise<any[]> {
    // Explicit return type
    try {
      return await this.respository.find(
        entityFilterQuery,
        projection,
        options,
      );
    } catch (error) {
      this.logger.error('Error finding documents:', error);
      throw error;
    }
  }

  async updateOne(
    id: string,
    data: UpdateQuery<T>,
    options: QueryOptions = {},
  ): Promise<any> {
    // Explicit return type
    try {
      const updatedDocument = await this.respository.findOneAndUpdate(
        { _id: id },
        data,
        { ...options, new: true },
      );
      if (!updatedDocument) {
        throw new NotFoundException(`Document with ID ${id} not found`);
      }
      return updatedDocument;
    } catch (error) {
      this.logger.error('Error updating document:', error);
      throw error;
    }
  }

  async deleteOne(
    filterQuery: FilterQuery<T>,
  ): Promise<{ deletedCount: number }> {
    try {
      const result = await this.respository.deleteOne(filterQuery);
      if (result.deletedCount === 0) {
        throw new NotFoundException(`Document not found for deletion`);
      }
      return result;
    } catch (error) {
      this.logger.error('Error deleting document:', error);
      throw error;
    }
  }

  async paginate(
    filterQuery: FilterQuery<T>,
    page: number,
    limit: number,
  ): Promise<{ list: any[]; pagination: Record<string, any> }> {
    // Explicit return type
    try {
      const skip = (page - 1) * limit;

      const [list, total] = await Promise.all([
        this.respository.find(filterQuery, null, { skip, limit }),
        this.respository.countDocuments(filterQuery),
      ]);

      return {
        list,
        pagination: {
          totalItems: total,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          pageSize: limit,
        },
      };
    } catch (error) {
      this.logger.error('Error paginating documents:', error);
      throw error;
    }
  }

  async list(projection?: Record<string, unknown>): Promise<any[]> {
    try {
      const documents = await this.respository.find({}, projection);
      return documents.sort((a: any, b: any) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });
    } catch (error) {
      this.logger.error('Error listing documents:', error);
      throw error;
    }
  }

  async updateTransaction(
    transactionId: string,
    update: UpdateQuery<Document>,
    options?: QueryOptions,
  ): Promise<Document | null> {
    try {
      const filter: FilterQuery<Document> = { _id: transactionId };
      return await this.respository.updateTransaction(filter, update, options);
    } catch (error) {
      this.logger.error('Error updating transaction:', error);
      return null;
    }
  }
}
