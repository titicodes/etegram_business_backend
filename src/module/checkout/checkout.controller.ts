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
  Logger,
} from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { Checkout } from './schema/checkout.schema';
import { JwtAuthGuard } from '../auth/guard/jwtGuard';
import { User } from '../user/schema/user.schema';
import { Product } from '../product/schema/product.schema';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';

@ApiTags('checkout')
@Controller('checkout')
@UseGuards(JwtAuthGuard)
export class CheckoutController {
  private readonly logger = new Logger(CheckoutController.name);
  
  constructor(private readonly checkoutService: CheckoutService) { }

  /**
   * @desc Scan a product by barcode and update the cart
   * @route GET /checkout/scan/:code
   */
  @Get('scan/:code')
  @ApiOperation({ summary: 'Scan a product for checkout' })
  @ApiParam({ name: 'code', description: 'Product barcode' })
  @ApiQuery({ name: 'storeId', description: 'Store ID', required: true })
  @ApiQuery({ name: 'cart', description: 'Current cart items as JSON string', required: false })
  @ApiResponse({ status: 200, description: 'Product scanned successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async scanProduct(
    @Param('code') code: string,
    @Request() req,
    @Query('cart') cartString?: string,
    @Query('storeId') storeId?: string,
  ): Promise<{ product: Product; cart: { code: string; quantity: number }[] }> {
    const user = req.user;
    let cart: { code: string; quantity: number }[] = [];

    // Log important inputs for debugging
    this.logger.log(`Controller: Scanning code=${code}, storeId=${storeId}, userId=${user.id}`);

    if (cartString) {
      try {
        cart = JSON.parse(cartString);
      } catch (error) {
        this.logger.error(`Invalid cart format: ${cartString}`);
        throw new BadRequestException('Invalid cart format.');
      }
    }

    // Validate storeId is provided
    if (!storeId) {
      this.logger.error('Store ID missing in scan request');
      throw new BadRequestException('Store ID is required to scan products.');
    }

    try {
      // Pass storeId to service method
      return await this.checkoutService.scanProduct(code, cart, user._id, storeId);
    } catch (error) {
      this.logger.error(`Scan product error: ${error.message}`, error.stack);
      throw error; // Rethrow to maintain the original error
    }
  }

  /**
   * @desc Create a new checkout (place an order)
   * @route POST /checkout
   */
  @Post()
  @ApiOperation({ summary: 'Create a new checkout' })
  @ApiResponse({ status: 201, description: 'Checkout created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createCheckout(
    @Body() createCheckoutDto: CreateCheckoutDto,
    @Req() req,
  ): Promise<Checkout> {
    const user = req.user;
    this.logger.log(`Creating checkout for user: ${user.id}, store: ${createCheckoutDto.storeId}`);

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

    try {
      return await this.checkoutService.createCheckout(createCheckoutDto, user);
    } catch (error) {
      this.logger.error(`Checkout creation error: ${error.message}`, error.stack);
      throw error; // Rethrow to maintain the original error
    }
  }

  /**
   * @desc Update order status (Processing/Completed)
   * @route PUT /checkout/status/:id
   */
  @Put('status/:id')
  @ApiOperation({ summary: 'Update order status' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order status updated successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async updateOrderStatus(
    @Param('id') orderId: string,
    @Body('status') status: 'Processing' | 'Completed',
  ): Promise<Checkout> {
    this.logger.log(`Updating order status: ${orderId} to ${status}`);
    return this.checkoutService.updateOrderStatus(orderId, status);
  }


}