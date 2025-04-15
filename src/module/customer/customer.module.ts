import { Module } from '@nestjs/common';
import { Customer, CustomerSchema } from './schema/customer.schema';
import { CustomerService } from './customer.service';
import { CustomerController } from './customer.controller';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
    imports: [MongooseModule.forFeature([{ name: Customer.name, schema: CustomerSchema }])],
    providers: [CustomerService],
    controllers: [CustomerController],
    exports: [CustomerService],
})
export class CustomerModule { }
