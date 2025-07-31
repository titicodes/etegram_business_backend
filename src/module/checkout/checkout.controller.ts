// import { Controller, Post, Patch, Body, Request, UseGuards, Get, Param, Query, BadRequestException } from '@nestjs/common';
// import { CheckoutService } from './checkout.service';
// import { UserService } from '../user/user.service';
// import { JwtAuthGuard } from '../auth/guard/jwtGuard';
// import { ScanProductDto, CreateCheckoutDto, UpdateOrderStatusDto } from './dto/create-checkout.dto';

// @Controller('checkout')
// export class CheckoutController {
//   constructor(
//     private readonly checkoutService: CheckoutService,
//     private readonly userService: UserService,
//   ) {}

//   @UseGuards(JwtAuthGuard)
//   @Get('check-product/:code')
//   async checkProduct(
//     @Param('code') code: string,
//     @Query('storeId') storeId: string,
//     @Request() req,
//   ) {
//     return this.checkoutService.checkProduct(code, storeId, req.user._id, req.user.role);
//   }

//   @UseGuards(JwtAuthGuard)
//   @Post('scan')
//   async scanProduct(@Body() scanProductDto: ScanProductDto, @Request() req) {
//     const { code, cart, storeId } = scanProductDto;
//     if (!code || !cart || !storeId) {
//       throw new BadRequestException('Code, cart, and storeId are required');
//     }
//     return this.checkoutService.scanProduct(code, cart, req.user._id, storeId, req.user.role);
//   }

//   @UseGuards(JwtAuthGuard)
//   @Post()
//   async createCheckout(@Body() createCheckoutDto: CreateCheckoutDto, @Request() req) {
//     const user = await this.userService.findById(req.user._id);
//     if (!user) {
//       throw new BadRequestException('User not found');
//     }
//     return this.checkoutService.createCheckout(createCheckoutDto, user);
//   }

//   @UseGuards(JwtAuthGuard)
//   @Patch(':id/status')
//   async updateOrderStatus(@Body() updateOrderStatusDto: UpdateOrderStatusDto, @Request() req) {
//     const { status } = updateOrderStatusDto;
//     if (!status) {
//       throw new BadRequestException('Status is required');
//     }
//     return this.checkoutService.updateOrderStatus(req.params.id, status, req.user._id, req.user.role);
//   }

//   @UseGuards(JwtAuthGuard)
//   @Get('sales-history')
//   async getSalesHistory(
//     @Query('storeId') storeId: string,
//     @Query('productId') productId: string,
//     @Request() req,
//   ) {
//     if (!storeId) {
//       throw new BadRequestException('Store ID is required');
//     }
//     return this.checkoutService.getSalesHistory(storeId, req.user._id, req.user.role, productId);
//   }

//   @UseGuards(JwtAuthGuard)
//   @Get('owing')
//   async getOwingRecords(
//     @Query('storeId') storeId: string,
//     @Query('supplierId') supplierId: string,
//     @Request() req,
//   ) {
//     if (!storeId) {
//       throw new BadRequestException('Store ID is required');
//     }
//     return this.checkoutService.getOwingRecords(storeId, req.user._id, req.user.role, supplierId);
//   }

//   @UseGuards(JwtAuthGuard)
//   @Get('owed')
//   async getOwedRecords(
//     @Query('storeId') storeId: string,
//     @Query('customerId') customerId: string,
//     @Request() req,
//   ) {
//     if (!storeId) {
//       throw new BadRequestException('Store ID is required');
//     }
//     return this.checkoutService.getOwedRecords(storeId, req.user._id, req.user.role, customerId);
//   }
// }

import { Controller, Post, Patch, Body, Request, UseGuards, Get, Param, Query, Logger, BadRequestException } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { UserService } from '../user/user.service';
import { JwtAuthGuard } from '../auth/guard/jwtGuard';
import { ScanProductDto, CreateCheckoutDto, UpdateOrderStatusDto, CheckProductDto } from './dto/create-checkout.dto';

@Controller('checkout')
export class CheckoutController {
  private readonly logger = new Logger(CheckoutController.name);

  constructor(
    private readonly checkoutService: CheckoutService,
    private readonly userService: UserService,
  ) { }

  @UseGuards(JwtAuthGuard)
  @Post('check-product/:code')
  async checkProduct(
    @Param('code') code: string,
    @Body() checkProductDto: CheckProductDto,
    @Request() req,
  ) {
    this.logger.log(`Received checkProduct request: Code=${code}, StoreId=${checkProductDto.storeId}, UserId=${req.user._id}`);
    return this.checkoutService.checkProduct(code, checkProductDto.storeId, req.user._id, req.user.role);
  }

  // Other endpoints remain unchanged
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

  @UseGuards(JwtAuthGuard)
  @Get('sales-history')
  async getSalesHistory(
    @Query('storeId') storeId: string,
    @Query('productId') productId: string,
    @Request() req,
  ) {
    if (!storeId) {
      throw new BadRequestException('Store ID is required');
    }
    return this.checkoutService.getSalesHistory(storeId, req.user._id, req.user.role, productId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('owing')
  async getOwingRecords(
    @Query('storeId') storeId: string,
    @Query('supplierId') supplierId: string,
    @Request() req,
  ) {
    if (!storeId) {
      throw new BadRequestException('Store ID is required');
    }
    return this.checkoutService.getOwingRecords(storeId, req.user._id, req.user.role, supplierId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('owed')
  async getOwedRecords(
    @Query('storeId') storeId: string,
    @Query('customerId') customerId: string,
    @Request() req,
  ) {
    if (!storeId) {
      throw new BadRequestException('Store ID is required');
    }
    return this.checkoutService.getOwedRecords(storeId, req.user._id, req.user.role, customerId);
  }
}