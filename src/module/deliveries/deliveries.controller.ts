import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
  Query,
} from '@nestjs/common';
import { DeliveriesService } from './deliveries.service';
import { CreateDeliveryDto } from './dto/delivery.dto';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';
import { JwtAuthGuard } from '../auth/guard/jwtGuard';
import { CreateDeliveryTransactionDto } from './dto/create_delivery-transaction.dto';

@Controller('deliveries')
export class DeliveriesController {
  constructor(private readonly deliveryService: DeliveriesService) {}

  @UseGuards(JwtAuthGuard)
  @Post('agent')
  createAgent(@Body() createDeliveryDto: CreateDeliveryDto, @Request() req) {
    return this.deliveryService.createDeliveryAgent(
      createDeliveryDto,
      req.user,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('transaction')
  createTransaction(
    @Body() createDeliveryTransactionDto: CreateDeliveryTransactionDto,
    @Request() req,
  ) {
    return this.deliveryService.createDeliveryTransaction(
      createDeliveryTransactionDto,
      req.user,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('agents')
  findAllAgents(@Request() req, @Query('storeId') storeId?: string) {
    return this.deliveryService.findAllDeliveryAgents(req.user, storeId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('transactions')
  findAllTransactions(@Request() req, @Query('storeId') storeId?: string) {
    return this.deliveryService.findAllDeliveryTransactions(req.user, storeId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('agent/:id')
  findOneAgent(@Param('id') id: string, @Request() req) {
    return this.deliveryService.findDeliveryAgentById(id, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('transaction/:id')
  findOneTransaction(@Param('id') id: string, @Request() req) {
    return this.deliveryService.findDeliveryTransactionById(id, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Put('agent/:id')
  updateAgent(
    @Param('id') id: string,
    @Body() updateDeliveryDto: UpdateDeliveryDto,
    @Request() req,
  ) {
    return this.deliveryService.updateDeliveryAgent(
      id,
      updateDeliveryDto,
      req.user,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete('agent/:id')
  deleteAgent(@Param('id') id: string, @Request() req) {
    return this.deliveryService.deleteDeliveryAgent(id, req.user);
  }
}
