// In your product-category.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProductCategory, ProductCategoryDocument } from './schema/product-category.schema';
import { ProductCategoriesRepository } from './category.repository';


@Injectable()
export class ProductCategoriesService {
  constructor(
    private readonly productCategoriesRepo: ProductCategoriesRepository,
  ) {}

  async findAll(): Promise<ProductCategory[]> {
    return this.productCategoriesRepo.findAll();
  }

  async findOne(id: string): Promise<ProductCategory | null> {
    const category = await this.productCategoriesRepo.findOne(id);
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async findOneByName(name: string): Promise<ProductCategory | null> {
    return this.productCategoriesRepo.findOneByName(name);
  }

  async create(createCategoryDto: any): Promise<ProductCategory> {
    return this.productCategoriesRepo.create(createCategoryDto);
  }

  async update(
    id: string,
    updateCategoryDto: any,
  ): Promise<ProductCategory | null> {
    const updatedCategory = await this.productCategoriesRepo.update(
      id,
      updateCategoryDto,
    );
    if (!updatedCategory) throw new NotFoundException('Category not found');
    return updatedCategory;
  }

  async remove(id: string): Promise<ProductCategory | null> {
    const deletedCategory = await this.productCategoriesRepo.remove(id);
    if (!deletedCategory) throw new NotFoundException('Category not found');
    return deletedCategory;
  }

  async findOrCreate(categoryName: string): Promise<ProductCategory> {
    let category = await this.findOneByName(categoryName);
    if (!category) {
      category = await this.create({ name: categoryName });
    }
    return category;
  }
}