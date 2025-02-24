import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Put,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { Checkout } from './schema/checkout.schema';
import { GetUser } from '../auth/get-user.decorator';
import { JwtAuthGuard } from '../auth/guard/jwtGuard';
import { User } from '../user/schema/user.schema';

@Controller('checkout')
@UseGuards(JwtAuthGuard)
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  /**
   * @desc Scan a product by barcode
   * @route GET /checkout/scan/:code
   */
  @Get('scan/:code')
  async scanProduct(@Param('code') code: string) {
    return await this.checkoutService.scanProduct(code);
  }

  /**
   * @desc Create a new checkout (place an order)
   * @route POST /checkout
   */
  @Post()
  async createCheckout(
    @Body() createCheckoutDto: CreateCheckoutDto,
    @GetUser() user: User,
  ): Promise<Checkout> {
    if (
      !createCheckoutDto.products ||
      createCheckoutDto.products.length === 0
    ) {
      throw new BadRequestException('Cart cannot be empty.');
    }
    return await this.checkoutService.createCheckout(createCheckoutDto, user);
  }

  /**
   * @desc Update order status (Processing/Completed)
   * @route PUT /checkout/status/:id
   */
  @Put('status/:id')
  async updateOrderStatus(
    @Param('id') orderId: string,
    @Body('status') status: 'Processing' | 'Completed',
  ) {
    return await this.checkoutService.updateOrderStatus(orderId, status);
  }
}
