import { Module } from '@nestjs/common';

import { ProductCategoriesRepository } from './category.repository';
import { ProductCategoriesService } from './product-category.service';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ProductCategory,
  ProductCategorySchema,
} from './schema/product-category.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProductCategory.name, schema: ProductCategorySchema },
    ]),
  ],
  controllers: [],
  providers: [ProductCategoriesService, ProductCategoriesRepository], // ✅ Move repository here
  exports: [ProductCategoriesService, ProductCategoriesRepository],
})
export class ProductCategoryModule {}
