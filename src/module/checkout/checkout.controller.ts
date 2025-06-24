import { Controller, Post, Patch, Body, Request, UseGuards, Get, Param, Query, BadRequestException } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { UserService } from '../user/user.service';
import { JwtAuthGuard } from '../auth/guard/jwtGuard';
import { ScanProductDto, CreateCheckoutDto, UpdateOrderStatusDto } from './dto/create-checkout.dto';

@Controller('checkout')
export class CheckoutController {
  constructor(
    private readonly checkoutService: CheckoutService,
    private readonly userService: UserService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('check-product/:code')
  async checkProduct(
    @Param('code') code: string,
    @Query('storeId') storeId: string,
    @Request() req,
  ) {
    if (!code || !storeId) {
      throw new BadRequestException('Code and storeId are required');
    }
    return this.checkoutService.checkProduct(code, storeId, req.user._id, req.user.role);
  }

  @UseGuards(JwtAuthGuard)
  @Post('scan')
  async scanProduct(@Body() scanProductDto: ScanProductDto, @Request() req) {
    const { code, cart, storeId } = scanProductDto;
    if (!code || !cart || !storeId) {
      throw new BadRequestException('Code, cart, and storeId are required');
    }
    return this.checkoutService.scanProduct(code, cart, req.user._id, storeId, req.user.role);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async createCheckout(@Body() createCheckoutDto: CreateCheckoutDto, @Request() req) {
    const user = await this.userService.findById(req.user._id);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    return this.checkoutService.createCheckout(createCheckoutDto, user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  async updateOrderStatus(@Body() updateOrderStatusDto: UpdateOrderStatusDto, @Request() req) {
    const { status } = updateOrderStatusDto;
    if (!status) {
      throw new BadRequestException('Status is required');
    }
    return this.checkoutService.updateOrderStatus(req.params.id, status, req.user._id, req.user.role);
  }
}