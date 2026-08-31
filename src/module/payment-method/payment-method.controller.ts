import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { PaymentMethodService } from './payment-method.service';
import {
  CreatePaymentMethodDto,
  UpdatePaymentMethodDto,
} from './dto/payment-method.dto';
import { JwtAuthGuard } from '../auth/guard/jwtGuard';

@Controller('payment-methods')
export class PaymentMethodController {
  constructor(private readonly paymentMethodService: PaymentMethodService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createDto: CreatePaymentMethodDto, @Request() req: any) {
    return this.paymentMethodService.create(createDto, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Query('storeId') storeId: string, @Request() req: any) {
    return this.paymentMethodService.findAll(req.user, storeId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.paymentMethodService.findOne(id, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdatePaymentMethodDto,
    @Request() req: any,
  ) {
    return this.paymentMethodService.update(id, updateDto, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.paymentMethodService.remove(id, req.user);
  }
}
