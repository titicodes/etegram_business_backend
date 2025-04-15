import { Injectable, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Expense, ExpenseDocument } from './schema/expense.schema';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { User } from '../user/schema/user.schema';

@Injectable()
export class ExpenseService {
    private readonly logger = new Logger(ExpenseService.name);

    constructor(
        @InjectModel(Expense.name) private readonly expenseModel: Model<ExpenseDocument>,
    ) { }

    async createExpense(createExpenseDto: CreateExpenseDto, user: User): Promise<Expense> {
        if (!user || !user._id) {
            throw new InternalServerErrorException('User information is missing.');
        }
    
        try {
            this.logger.log('Creating new expense...');
            const expense = new this.expenseModel({ ...createExpenseDto, user: user._id });
            const createdExpense = await expense.save();
            this.logger.log('Expense created successfully.');
            return createdExpense;
        } catch (error) {
            this.logger.error('Failed to create expense:', error);
            throw new InternalServerErrorException('Failed to create expense.');
        }
    }
    


    async findAllExpenses(user: User): Promise<Expense[]> {
        try {
            this.logger.log('Fetching all expenses...');
            const expenses = await this.expenseModel.find({ user: user._id }).exec();
            this.logger.log('Expenses fetched successfully.');
            return expenses;
        } catch (error) {
            this.logger.error('Failed to fetch expenses:', error);
            throw new InternalServerErrorException('Failed to fetch expenses.');
        }
    }

    async findExpenseById(id: string, user: User): Promise<Expense> {
        try {
            this.logger.log(`Fetching expense with ID: ${id}...`);
            const expense = await this.expenseModel.findOne({ _id: id, user: user._id }).exec();
            if (!expense) {
                throw new NotFoundException(`Expense with ID ${id} not found.`);
            }
            this.logger.log(`Expense with ID ${id} fetched successfully.`);
            return expense;
        } catch (error) {
            this.logger.error(`Failed to fetch expense with ID: ${id}`, error);
            throw new InternalServerErrorException(`Failed to fetch expense with ID: ${id}`);
        }
    }

    async updateExpense(id: string, updateExpenseDto: CreateExpenseDto, user: User): Promise<Expense> {
        try {
            this.logger.log(`Updating expense with ID: ${id}...`);
            const updatedExpense = await this.expenseModel.findOneAndUpdate(
                { _id: id, user: user._id },
                updateExpenseDto,
                { new: true },
            ).exec();
            if (!updatedExpense) {
                throw new NotFoundException(`Expense with ID ${id} not found.`);
            }
            this.logger.log(`Expense with ID ${id} updated successfully.`);
            return updatedExpense;
        } catch (error) {
            this.logger.error(`Failed to update expense with ID: ${id}`, error);
            throw new InternalServerErrorException(`Failed to update expense with ID: ${id}`);
        }
    }

    async deleteExpense(id: string, user: User): Promise<{ deleted: boolean }> {
        try {
            this.logger.log(`Deleting expense with ID: ${id}...`);
            const result = await this.expenseModel.deleteOne({ _id: id, user: user._id }).exec();
            if (result.deletedCount === 0) {
                throw new NotFoundException(`Expense with ID ${id} not found.`);
            }
            this.logger.log(`Expense with ID ${id} deleted successfully.`);
            return { deleted: true };
        } catch (error) {
            this.logger.error(`Failed to delete expense with ID: ${id}`, error);
            throw new InternalServerErrorException(`Failed to delete expense with ID: ${id}`);
        }
    }
}