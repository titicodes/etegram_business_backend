import { Controller, Post, Body, Get, Param, Put, Delete, UseGuards, Request, Req } from '@nestjs/common';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { AuthGuard } from '@nestjs/passport';
import { ExpenseService } from './expenses.service';
import { JwtAuthGuard } from '../auth/guard/jwtGuard';

@Controller('expenses')

export class ExpenseController {
    constructor(private readonly expenseService: ExpenseService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    async createExpense(@Body() createExpenseDto: CreateExpenseDto, @Req() req) {
        const user = req.user; // Ensure user is available from JWT token
        return this.expenseService.createExpense(createExpenseDto, user);
    }


    @Get()
    async findAllExpenses(@Request() req) {
        return this.expenseService.findAllExpenses(req.user);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    async findExpenseById(@Param('id') id: string, @Request() req) {
        return this.expenseService.findExpenseById(id, req.user);
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard)
    async updateExpense(@Param('id') id: string, @Body() updateExpenseDto: CreateExpenseDto, @Request() req) {
        return this.expenseService.updateExpense(id, updateExpenseDto, req.user);
    }

    @Delete(':id')
    async deleteExpense(@Param('id') id: string, @Request() req) {
        return this.expenseService.deleteExpense(id, req.user);
    }
}