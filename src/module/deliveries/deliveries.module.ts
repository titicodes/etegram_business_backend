import { Module } from '@nestjs/common';
import { DeliveriesController } from './deliveries.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Deliveries, DeliveriesSchem } from './schema/deliveries.schema';
import { DeliveriesService } from './deliveries.service';
import { Product, ProductSchema } from '../product/schema/product.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Deliveries.name, schema: DeliveriesSchem }, { name: Product.name, schema: ProductSchema }])],
  controllers: [DeliveriesController],
  providers: [DeliveriesService],
  exports: [DeliveriesService],
})
export class DeliveriesModule { }
