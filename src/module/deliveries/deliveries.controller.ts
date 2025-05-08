import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { DeliveriesService } from './deliveries.service';
import { DeliveryDto } from './dto/delivery.dto';
import { JwtAuthGuard } from '../auth/guard/jwtGuard';

@Controller('deliveries')
export class DeliveriesController {
    constructor(private readonly deliveryService: DeliveriesService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    async createDeliveries(@Body() createSupplyDto: DeliveryDto, @Req() req) {
        const user = req.user; // Ensure user is available from JWT token
        return this.deliveryService.createDeliveries(createSupplyDto, user);
    }

    @Get()
    async findAllDeliveries(@Req() req) {
        return this.deliveryService.findAllDeliveries(req.user);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    async findDeliveriesById(@Param('id') id: string, @Req() req) {
        return this.deliveryService.findExpenseById(id, req.user);
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard)
    async updateDeliveries(@Param('id') id: string, @Body() updateExpenseDto: DeliveryDto, @Req() req) {
        return this.deliveryService.updateExpense(id, updateExpenseDto, req.user);
    }

    @Delete(':id')
    async deleteDelivery(@Param('id') id: string, @Req() req) {
        return this.deliveryService.deleteDelivery(id, req.user);
    }
}
