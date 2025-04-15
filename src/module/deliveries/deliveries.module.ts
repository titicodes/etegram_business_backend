import { Module } from '@nestjs/common';
import { DeliveriesController } from './deliveries.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Deliveries, DeliveriesSchem } from './schema/deliveries.schema';
import { DeliveriesService } from './deliveries.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Deliveries.name, schema: DeliveriesSchem }])],
  controllers: [DeliveriesController],
  providers: [DeliveriesService],
  exports: [DeliveriesService],
})
export class DeliveriesModule { }
