// In your product-category.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProductCategory, ProductCategoryDocument } from './schema/product-category.schema';

@Injectable()
export class ProductCategoriesRepository {
  constructor(
    @InjectModel(ProductCategory.name)
    private readonly categoryModel: Model<ProductCategoryDocument>,
  ) {}

  async findAll(): Promise<ProductCategory[]> {
    return this.categoryModel.find().exec();
  }

  async findOne(id: string): Promise<ProductCategory | null> {
    return this.categoryModel.findById(id).exec();
  }

  async findOneByName(name: string): Promise<ProductCategory | null> {
    return this.categoryModel.findOne({ name }).exec();
  }

  async create(createCategoryDto: any): Promise<ProductCategory> {
    const newCategory = new this.categoryModel(createCategoryDto);
    return newCategory.save();
  }

  async update(id: string, updateCategoryDto: any): Promise<ProductCategory | null> {
    return this.categoryModel.findByIdAndUpdate(id, updateCategoryDto, { new: true }).exec();
  }

  async remove(id: string): Promise<ProductCategory | null> {
    return this.categoryModel.findByIdAndDelete(id).exec();
  }
}