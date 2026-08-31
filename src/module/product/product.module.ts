import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductSchema } from './schema/product.schema';
import { ProductController } from './product.controller';
import { ProductCategoriesRepository } from '../product-category/category.repository';
import { ProductCategoriesService } from '../product-category/product-category.service';
import { ProductCategorySchema } from '../product-category/schema/product-category.schema';
import { ProductCategoryModule } from '../product-category/product-category.module';
import { StoreSchema } from '../store/schema/store.schema';
import { StoreModule } from '../store/store.module';
import { ProductHistorySchema } from './schema/product-history.schema';
import { DeliveriesSchema } from '../deliveries/schema/deliveries.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Product', schema: ProductSchema },
      { name: 'ProductCategory', schema: ProductCategorySchema },
      { name: 'Store', schema: StoreSchema },
      { name: 'ProductHistory', schema: ProductHistorySchema },
      { name: 'Deliveries', schema: DeliveriesSchema }, // Assuming DeliveriesSchema is defined elsewhere
    ]),
    ProductCategoryModule,
    StoreModule,
  ],
  controllers: [ProductController],
  providers: [
    ProductService,
    ProductCategoriesRepository,
    ProductCategoriesService,
  ],
  exports: [ProductService],
})
export class ProductModule {}
