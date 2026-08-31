import {
  Document,
  FilterQuery,
  Model,
  PopulateOptions,
  QueryOptions,
  UpdateQuery,
} from 'mongoose';

export abstract class CoreRepository<T extends Document> {
  constructor(protected readonly entityModel: Model<T>) {}
  async findOne(
    entityFilterQuery: FilterQuery<T>,
    projection?: Record<string, unknown>,
    options?: QueryOptions,
  ): Promise<T | null> {
    return this.entityModel
      .findOne(
        entityFilterQuery,
        {
          __v: 0,
          ...projection,
        },
        options,
      )
      .exec();
  }

  async countDocuments(entityFilterQuery: FilterQuery<T>): Promise<number> {
    return this.entityModel.countDocuments(entityFilterQuery).exec();
  }
  async find(
    entityFilterQuery: FilterQuery<T>,
    projection?: Record<string, unknown>,
    options?: QueryOptions,
  ): Promise<T[]> {
    return this.entityModel.find(entityFilterQuery, projection, options);
  }

  async create(data) {
    const document = new this.entityModel(data);
    return await document.save();
  }

  async createManys(createEntityData: unknown): Promise<T> {
    return this.entityModel.create(createEntityData);
  }

  async createMany(createEntityData: Partial<T>[]): Promise<T[]> {
    return this.entityModel.insertMany(createEntityData) as unknown as Promise<
      T[]
    >;
  }

  async findOneAndUpdate(
    entityFilterQuery: FilterQuery<T>,
    updateEntityData: UpdateQuery<unknown>,
    options: QueryOptions,
  ): Promise<T | null> {
    return this.entityModel.findOneAndUpdate(
      entityFilterQuery,
      updateEntityData,
      {
        new: true,
        ...options,
      },
    );
  }

  async deleteOne(
    entityFilterQuery: FilterQuery<T>,
  ): Promise<{ deletedCount: number }> {
    const deleteResult = await this.entityModel
      .deleteOne(entityFilterQuery)
      .exec();
    return { deletedCount: deleteResult.deletedCount || 0 };
  }

  async deleteMany(
    entityFilterQuery: FilterQuery<T>,
  ): Promise<{ deletedCount: number }> {
    const deleteResult = await this.entityModel
      .deleteMany(entityFilterQuery)
      .exec();
    return { deletedCount: deleteResult.deletedCount || 0 };
  }

  newDocument<D>(data: D): T {
    return new this.entityModel(data);
  }

  model(): Model<T> {
    return this.entityModel;
  }

  async save(entity: any, options?: QueryOptions): Promise<T> {
    return entity.save(options);
  }

  async saveData(
    entity: Record<string, any>,
    options?: QueryOptions,
  ): Promise<T> {
    return this.newDocument(entity).save(options);
  }

  async populate(
    entity: any,
    path?: string | PopulateOptions | (string | PopulateOptions)[],
  ): Promise<T> {
    return entity.populate(path);
  }

  // Define the updateTransaction method in the CoreRepository
  async updateTransaction(
    filter: FilterQuery<T>,
    update: UpdateQuery<T>,
    options?: QueryOptions,
  ): Promise<T | null> {
    return this.entityModel.findOneAndUpdate(filter, update, options).exec();
  }
}
