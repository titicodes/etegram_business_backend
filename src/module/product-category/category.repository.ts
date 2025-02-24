import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ProductCategory,
  ProductCategoryDocument,
} from './schema/product-category.schema';

@Injectable()
export class ProductCategoriesRepository {
  constructor(
    @InjectModel(ProductCategory.name)
    private readonly productCategoryModel: Model<ProductCategoryDocument>,
  ) {}

  async findAll(): Promise<ProductCategory[]> {
    return this.productCategoryModel.find();
  }

  async findOne(id: string): Promise<ProductCategory | null> {
    return this.productCategoryModel.findById(id);
  }

  async create(
    categoryData: Partial<ProductCategory>,
  ): Promise<ProductCategory> {
    const category = new this.productCategoryModel(categoryData);
    return category.save();
  }

  async update(
    id: string,
    categoryData: Partial<ProductCategory>,
  ): Promise<ProductCategory | null> {
    return this.productCategoryModel.findByIdAndUpdate(id, categoryData, {
      new: true,
    });
  }

  async remove(id: string): Promise<ProductCategory | null> {
    return this.productCategoryModel.findByIdAndDelete(id);
  }
}
