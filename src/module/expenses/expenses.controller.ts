import { Controller, Post, Body, Get, Param, Put, Delete, UseGuards, Request, Req, InternalServerErrorException, NotFoundException } from '@nestjs/common';
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
    @UseGuards(JwtAuthGuard)
    async findAllExpenses(@Req() req) {
        console.log('Authenticated User (Find All):', req.user);
        return this.expenseService.findAllExpenses(req.user);
    }


    // @Get(':id')
    // @UseGuards(JwtAuthGuard)
    // async findExpenseById(@Param('id') id: string, @Request() req) {
    //     return this.expenseService.findExpenseById(id, req.user);
    // }

    @Get(':id') // New route to fetch a single expense by ID
    async findExpenseById(@Param('id') id: string, @Request() req) {
        console.log('Authenticated User (Find One):', req.user);
        try {
            const expense = await this.expenseService.findExpenseById(id, req.user);
            return expense;
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            console.error('Error fetching expense by ID:', error);
            throw new InternalServerErrorException(`Failed to fetch expense with ID: ${id}`);
        }
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard)
    async updateExpense(@Param('id') id: string, @Body() updateExpenseDto: CreateExpenseDto, @Request() req) {
        return this.expenseService.updateExpense(id, updateExpenseDto, req.user);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    async deleteExpense(@Param('id') id: string, @Request() req) {
        return this.expenseService.deleteExpense(id, req.user);
    }
}