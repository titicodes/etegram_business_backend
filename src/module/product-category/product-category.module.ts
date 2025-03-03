import { Module } from '@nestjs/common';

import { ProductCategoriesRepository } from './category.repository';
import { ProductCategoriesService } from './product-category.service';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ProductCategory,
  ProductCategorySchema,
} from './schema/product-category.schema';
import { ProductCategoriesController } from './product-category.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProductCategory.name, schema: ProductCategorySchema },
    ]),
  ],
  controllers: [ProductCategoriesController],
  providers: [ProductCategoriesService, ProductCategoriesRepository], // ✅ Move repository here
  exports: [ProductCategoriesService, ProductCategoriesRepository],
})
export class ProductCategoryModule {}
