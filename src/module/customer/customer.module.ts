import { Module } from '@nestjs/common';
import { Customer, CustomerSchema } from './schema/customer.schema';
import { CustomerService } from './customer.service';
import { CustomerController } from './customer.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Store, StoreSchema } from '../store/schema/store.schema';

@Module({
    imports: [MongooseModule.forFeature([{ name: Customer.name, schema: CustomerSchema }, { name: Store.name, schema: StoreSchema },])],
    providers: [CustomerService],
    controllers: [CustomerController],
    exports: [CustomerService],
})
export class CustomerModule { }
