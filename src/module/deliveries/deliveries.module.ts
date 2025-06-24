import { Module } from '@nestjs/common';
import { DeliveriesController } from './deliveries.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { DeliveriesService } from './deliveries.service';
import { Product, ProductSchema } from '../product/schema/product.schema';
import { Deliveries, DeliveriesSchema } from './schema/deliveries.schema';
import { DeliveryTransaction, DeliveryTransactionSchema } from './schema/delivery-transaction.schema';
import { Store, StoreSchema } from '../store/schema/store.schema';

@Module({
  imports: [MongooseModule.forFeature([
    { name: Deliveries.name, schema: DeliveriesSchema },
     { name: DeliveryTransaction.name, schema: DeliveryTransactionSchema },
     { name: Store.name, schema: StoreSchema },
      { name: Product.name, schema: ProductSchema }])],
  controllers: [DeliveriesController],
  providers: [DeliveriesService],
  exports: [DeliveriesService],
})
export class DeliveriesModule { }
