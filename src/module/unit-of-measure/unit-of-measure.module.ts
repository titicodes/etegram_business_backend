import { Module } from '@nestjs/common';
import { UnitOfMeasureService } from './unit-of-measure.service';
import { MongooseModule } from '@nestjs/mongoose';
import {
  UnitOfMeasure,
  UnitOfMeasureSchema,
} from './schema/unit-of-mesure.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UnitOfMeasure.name, schema: UnitOfMeasureSchema },
    ]),
    UnitOfMeasureModule,
  ],
  controllers: [],
  providers: [UnitOfMeasureService],
  exports: [UnitOfMeasureService],
})
export class UnitOfMeasureModule {}
