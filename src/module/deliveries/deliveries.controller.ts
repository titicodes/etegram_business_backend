import { Controller, Post, Get, Put, Body, Param, Request, UseGuards } from '@nestjs/common';
import { DeliveriesService } from './deliveries.service';
import { CreateDeliveryDto } from './dto/delivery.dto';
import { JwtAuthGuard } from '../auth/guard/jwtGuard';

@Controller('deliveries')
export class DeliveriesController {
  constructor(private readonly deliveryService: DeliveriesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createSupplyDto: CreateDeliveryDto, @Request() req) {
    return this.deliveryService.createDelivery(createSupplyDto, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.deliveryService.findDeliveryById(id, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(@Param('id') id: string, @Body() updateExpenseDto, @Request() req) {
    return this.deliveryService.updateDelivery(id, updateExpenseDto, req.user);
  }
}