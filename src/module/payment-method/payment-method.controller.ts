// payment-method/payment-method.controller.ts
import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { PaymentMethodService } from './payment-method.service';
import { GetUser } from '../auth/get-user.decorator';
import { JwtAuthGuard } from '../auth/guard/jwtGuard';
import { User } from '../user/schema/user.schema';
import { CreatePaymentMethodDto, UpdatePaymentMethodDto } from './dto/payment-method.dto';

@Controller('payment-methods')
@UseGuards(JwtAuthGuard)
export class PaymentMethodController {
    constructor(private readonly paymentMethodService: PaymentMethodService) { }

    @Post()
    async create(@Body() createPaymentMethodDto: CreatePaymentMethodDto, @GetUser() user: User) {
        return this.paymentMethodService.create(createPaymentMethodDto, user);
    }

    @Get()
    async findAll(@GetUser() user: User) {
        return this.paymentMethodService.findAll(user);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.paymentMethodService.findOne(id);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() updatePaymentMethodDto: UpdatePaymentMethodDto) {
        return this.paymentMethodService.update(id, updatePaymentMethodDto);
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.paymentMethodService.remove(id);
    }
}