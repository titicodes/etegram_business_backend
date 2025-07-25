// // In your product-category.repository.ts
// import { Injectable } from '@nestjs/common';
// import { InjectModel } from '@nestjs/mongoose';
// import { Model } from 'mongoose';
// import { ProductCategory, ProductCategoryDocument } from './schema/product-category.schema';

// @Injectable()
// export class ProductCategoriesRepository {
//   constructor(
//     @InjectModel(ProductCategory.name)
//     private readonly categoryModel: Model<ProductCategoryDocument>,
//   ) {}

//   async findAll(): Promise<ProductCategory[]> {
//     return this.categoryModel.find().exec();
//   }

//   async findOne(id: string): Promise<ProductCategory | null> {
//     return this.categoryModel.findById(id).exec();
//   }

//   async findOneByName(name: string): Promise<ProductCategory | null> {
//     return this.categoryModel.findOne({ name }).exec();
//   }

//   async create(createCategoryDto: any): Promise<ProductCategory> {
//     const newCategory = new this.categoryModel(createCategoryDto);
//     return newCategory.save();
//   }

//   async update(id: string, updateCategoryDto: any): Promise<ProductCategory | null> {
//     return this.categoryModel.findByIdAndUpdate(id, updateCategoryDto, { new: true }).exec();
//   }

//   async remove(id: string): Promise<ProductCategory | null> {
//     return this.categoryModel.findByIdAndDelete(id).exec();
//   }
// }

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession } from 'mongoose';
import { ProductCategory, ProductCategoryDocument } from './schema/product-category.schema';

@Injectable()
export class ProductCategoriesRepository {
  constructor(
    @InjectModel(ProductCategory.name)
    private readonly productCategoryModel: Model<ProductCategoryDocument>,
  ) {}

  async findAll(): Promise<ProductCategory[]> {
    return this.productCategoryModel.find().exec();
  }

  async findOne(id: string, session?: ClientSession): Promise<ProductCategory | null> {
    return this.productCategoryModel.findById(id).session(session).exec();
  }

  async findOneByName(name: string, session?: ClientSession): Promise<ProductCategory | null> {
    return this.productCategoryModel.findOne({ name }).session(session).exec();
  }

  async create(createCategoryDto: any, session?: ClientSession): Promise<ProductCategory> {
    const category = new this.productCategoryModel(createCategoryDto);
    return category.save({ session });
  }

  async update(id: string, updateCategoryDto: any, session?: ClientSession): Promise<ProductCategory | null> {
    return this.productCategoryModel
      .findByIdAndUpdate(id, updateCategoryDto, { new: true })
      .session(session)
      .exec();
  }

  async remove(id: string, session?: ClientSession): Promise<ProductCategory | null> {
    return this.productCategoryModel.findByIdAndDelete(id).session(session).exec();
  }
}