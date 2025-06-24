import { Controller, Post, Body, Get, Param, Put, Delete, UseGuards, Request, InternalServerErrorException, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateExpenseDto, UpdateExpenseDto } from './dto/create-expense.dto';
import { ExpenseService } from './expenses.service';
import { JwtAuthGuard } from '../auth/guard/jwtGuard';

@Controller('expenses')
export class ExpenseController {
    constructor(private readonly expenseService: ExpenseService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    async createExpense(@Body() createExpenseDto: CreateExpenseDto, @Request() req) {
        try {
            return await this.expenseService.createExpense(createExpenseDto, req.user);
        } catch (error) {
            throw error instanceof NotFoundException || error instanceof BadRequestException
                ? error
                : new InternalServerErrorException('Failed to create expense');
        }
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    async findAllExpenses(@Request() req) {
        try {
            return await this.expenseService.findAllExpenses(req.user);
        } catch (error) {
            throw error instanceof BadRequestException
                ? error
                : new InternalServerErrorException('Failed to fetch expenses');
        }
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    async findExpenseById(@Param('id') id: string, @Request() req) {
        try {
            return await this.expenseService.findExpenseById(id, req.user);
        } catch (error) {
            throw error instanceof NotFoundException || error instanceof BadRequestException
                ? error
                : new InternalServerErrorException(`Failed to fetch expense with ID: ${id}`);
        }
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard)
    async updateExpense(@Param('id') id: string, @Body() updateExpenseDto: UpdateExpenseDto, @Request() req) {
        try {
            return await this.expenseService.updateExpense(id, updateExpenseDto, req.user);
        } catch (error) {
            throw error instanceof NotFoundException || error instanceof BadRequestException
                ? error
                : new InternalServerErrorException(`Failed to update expense with ID: ${id}`);
        }
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    async deleteExpense(@Param('id') id: string, @Request() req) {
        try {
            return await this.expenseService.deleteExpense(id, req.user);
        } catch (error) {
            throw error instanceof NotFoundException || error instanceof BadRequestException
                ? error
                : new InternalServerErrorException(`Failed to delete expense with ID: ${id}`);
        }
    }
}