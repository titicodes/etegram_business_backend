import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Expense, ExpenseSchema } from './schema/expense.schema';
import { ExpenseService } from './expenses.service';
import { ExpenseController } from './expenses.controller';

@Module({
    imports: [MongooseModule.forFeature([{ name: Expense.name, schema: ExpenseSchema }])],
    controllers: [ExpenseController],
    providers: [ExpenseService],
    exports: [ExpenseService],
})
export class ExpenseModule { }