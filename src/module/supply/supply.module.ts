import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Supply, SupplySchema } from './schema/supply.schema';
import { SupplierController } from './supply.controller';
import { SupplierService } from './supply.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Supply.name, schema: SupplySchema }]),
  ],
  providers: [SupplierService],
  controllers: [SupplierController],
  exports: [SupplierService],
})
export class SupplierModule {}
