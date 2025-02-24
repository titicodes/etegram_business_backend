// core-repository.interface.ts
import { FilterQuery, QueryOptions, UpdateQuery, Document, Model } from 'mongoose';

export interface CoreRepository<T extends Document> {
  entityModel: Model<T>;
  find(entityFilterQuery: FilterQuery<T>, projection?: Record<string, unknown>, options?: QueryOptions): Promise<T[]>;
  create(data: any): Promise<T>;
  createMany(data: any[]): Promise<T[]>;
  findOne(entityFilterQuery: FilterQuery<T>, projection?: Record<string, unknown>, options?: QueryOptions): Promise<T>;
  findOneAndUpdate(filter: FilterQuery<T>, update: UpdateQuery<T>, options?: QueryOptions): Promise<T>;
  deleteOne(filterQuery: FilterQuery<T>): Promise<{ deletedCount: number }>;
  deleteMany(filterQuery: FilterQuery<T>): Promise<{ deletedCount: number }>;
  countDocuments(filterQuery: FilterQuery<T>): Promise<number>;
  newDocument(data: any): T;
  save(document: T): Promise<T>;
  model(name: string): Model<T>;
}
