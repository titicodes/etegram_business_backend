import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductHistory, ProductHistorySchema } from './schema/product-history.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ProductHistory.name, schema: ProductHistorySchema }]),
  ],
  exports: [MongooseModule],
})
export class ProductHistoryModule {}