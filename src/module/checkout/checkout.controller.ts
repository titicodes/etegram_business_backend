import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Put,
  UseGuards,
  Request,
  BadRequestException,
  Query,
  Req,
} from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { Checkout } from './schema/checkout.schema';
import { GetUser } from '../auth/get-user.decorator';
import { JwtAuthGuard } from '../auth/guard/jwtGuard';
import { User } from '../user/schema/user.schema';
import { Product } from '../product/schema/product.schema';
import { CreateCheckoutDto } from './dto/create-checkout.dto';

@Controller('checkout')
@UseGuards(JwtAuthGuard)
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) { }

  /**
   * @desc Scan a product by barcode and update the cart
   * @route GET /checkout/scan/:code
   */
  @Get('scan/:code')
  async scanProduct(
    @Param('code') code: string,
    @Request() req,
    @Query('cart') cartString?: string,
    @Query('storeId') storeId?: string, // Added storeId as a query parameter
  ): Promise<{ product: Product; cart: { code: string; quantity: number }[] }> {
    const user = req.user;
    let cart: { code: string; quantity: number }[] = [];

    if (cartString) {
      try {
        cart = JSON.parse(cartString);
      } catch (error) {
        throw new BadRequestException('Invalid cart format.');
      }
    }

    // Validate storeId is provided
    if (!storeId) {
      throw new BadRequestException('Store ID is required to scan products.');
    }

    // Pass storeId to service method
    return this.checkoutService.scanProduct(code, cart, user.id, storeId);
  }

  /**
   * @desc Create a new checkout (place an order)
   * @route POST /checkout
   */
  @Post()
  async createCheckout(
    @Body() createCheckoutDto: CreateCheckoutDto,
    @Req() req,
  ): Promise<Checkout> {
    const user = req.user;
    console.log('🛠️ Checkout User:', user); // Debug log

    if (!user || !user.email) {
      throw new BadRequestException('User email is required.');
    }

    if (!createCheckoutDto.cart || createCheckoutDto.cart.length === 0) {
      throw new BadRequestException('Cart cannot be empty.');
    }

    // Validate storeId is provided in the DTO
    if (!createCheckoutDto.storeId) {
      throw new BadRequestException('Store ID is required for checkout.');
    }

    return this.checkoutService.createCheckout(createCheckoutDto, user);
  }

  /**
   * @desc Update order status (Processing/Completed)
   * @route PUT /checkout/status/:id
   */
  @Put('status/:id')
  async updateOrderStatus(
    @Param('id') orderId: string,
    @Body('status') status: 'Processing' | 'Completed',
  ): Promise<Checkout> {
    return this.checkoutService.updateOrderStatus(orderId, status);
  }
}