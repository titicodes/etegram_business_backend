import { FilterQuery, QueryOptions, UpdateQuery } from "mongoose";
import { CoreRepository } from "./repository";
import { NotFoundException } from "@nestjs/common";
import { Document } from 'mongoose';

export abstract class CoreService<T extends CoreRepository<any>> {
  constructor(protected readonly respository: T) {}

  /**
   * Create a new document in the collection.
   * @param data - The data to create the document.
   * @returns The created document.
   */
  async create(data: any): Promise<T> {
    return await this.respository.create(data);
  }

  /**
   * Find a single document based on a filter query.
   * @param entityFilterQuery - The filter query to find the document.
   * @param projection - Optional fields to project in the result.
   * @param options - Optional query options.
   * @returns The found document.
   */
  async findOne(
    entityFilterQuery: FilterQuery<T>,
    projection?: Record<string, unknown>,
    options?: QueryOptions,
  ) {
    return await this.respository.findOne(
      entityFilterQuery,
      projection,
      options,
    );
  }

  /**
   * Find multiple documents based on a filter query.
   * @param entityFilterQuery - The filter query to find the documents.
   * @param projection - Optional fields to project in the result.
   * @param options - Optional query options.
   * @returns An array of found documents.
   */
  async find(
    entityFilterQuery: FilterQuery<T>,
    projection?: Record<string, unknown>,
    options?: QueryOptions
  ): Promise<T[]> {
    return await this.respository.find(entityFilterQuery, projection, options);
  }

  /**
   * Update a single document by its ID.
   * @param id - The ID of the document to update.
   * @param data - The update data.
   * @param options - Optional query options.
   * @returns The updated document.
   */
  async updateOne(
    id: string,
    data: UpdateQuery<T>,
    options: QueryOptions = {}
  ): Promise<T> {
    const updatedDocument = await this.respository.findOneAndUpdate(
      { _id: id },
      data,
      { ...options, new: true }
    );
    if (!updatedDocument) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }
    return updatedDocument;
  }

  /**
   * Delete a single document based on a filter query.
   * @param filterQuery - The filter query to delete the document.
   * @returns An object with the deletion result.
   */
  async deleteOne(filterQuery: FilterQuery<T>): Promise<{ deletedCount: number }> {
    const result = await this.respository.deleteOne(filterQuery);
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Document not found for deletion`);
    }
    return result;
  }

  /**
   * Paginate documents based on a filter query and pagination options.
   * @param filterQuery - The filter query to paginate.
   * @param page - The page number.
   * @param limit - The number of items per page.
   * @returns An object containing the paginated list and metadata.
   */
  async paginate(
    filterQuery: FilterQuery<T>,
    page: number,
    limit: number
  ): Promise<{ list: T[]; pagination: Record<string, any> }> {
    const skip = (page - 1) * limit;

    const [list, total] = await Promise.all([
      this.respository.find(filterQuery, null, { skip, limit }),
      this.respository.countDocuments(filterQuery)
    ]);

    return {
      list,
      pagination: {
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        pageSize: limit
      }
    };
  }

   /**
 * List all documents in the collection.
 * @param projection - Optional fields to project in the result.
 * @returns An array of all documents.
 */
async list(projection?: Record<string, unknown>): Promise<any[]> {
  const documents = await this.respository.find({}, projection); // Await the result first
  return documents.sort((a: any, b: any) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return dateB - dateA; // Sort in descending order
  });
}

  /**
   * Update a transaction document.
   * @param transactionId - The ID of the transaction to update.
   * @param update - The update data.
   * @param options - Optional query options.
   * @returns The updated document.
   */
  async updateTransaction(
    transactionId: string,
    update: UpdateQuery<Document>,
    options?: QueryOptions
  ): Promise<Document | null> {
    const filter: FilterQuery<Document> = { _id: transactionId };
    return await this.respository.updateTransaction(filter, update, options);
  }
  
}
