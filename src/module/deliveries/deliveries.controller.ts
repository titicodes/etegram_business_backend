import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { DeliveriesService } from './deliveries.service';
import { DeliveryDto } from './dto/delivery.dto';
import { JwtAuthGuard } from '../auth/guard/jwtGuard';

@Controller('deliveries')
export class DeliveriesController {
    constructor(private readonly expenseService: DeliveriesService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    async createExpense(@Body() createExpenseDto: DeliveryDto, @Req() req) {
        const user = req.user; // Ensure user is available from JWT token
        return this.expenseService.createDeliveries(createExpenseDto, user);
    }

    @Get()
    async findAllExpenses(@Req() req) {
        return this.expenseService.findAllDeliveries(req.user);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    async findExpenseById(@Param('id') id: string, @Req() req) {
        return this.expenseService.findExpenseById(id, req.user);
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard)
    async updateExpense(@Param('id') id: string, @Body() updateExpenseDto: DeliveryDto, @Req() req) {
        return this.expenseService.updateExpense(id, updateExpenseDto, req.user);
    }

    @Delete(':id')
    async deleteExpense(@Param('id') id: string, @Req() req) {
        return this.expenseService.deleteDelivery(id, req.user);
    }
}
