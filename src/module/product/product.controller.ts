import { Controller, Get, Post, Patch, Delete, Body, Query, Param, Request, UseGuards } from '@nestjs/common';
import { ProductService } from './product.service';
import { JwtAuthGuard } from '../auth/guard/jwtGuard';
import { CreateProductDto } from './dto/create-product.dto';
import { ExpiringAndLowStockQueryDto } from './dto/expiring-and-low-stock-query.dto';
import { ExpiringProductsQueryDto } from './dto/expiring-products-query.dto';
import { FilterProductDto } from './dto/filter-product.dto';
import { LowStockProductsQueryDto } from './dto/low-stock-products-query.dto';
import { SupplyProductDto } from './dto/supply-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UserRoleEnum } from 'src/common/enums/user.enum';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) { }

  // --- POST ROUTES ---
  @UseGuards(JwtAuthGuard)
  @Post('add')
  async addProduct(@Body() createProductDto: CreateProductDto, @Request() req) {
    return this.productService.addProduct(
      createProductDto,
      req.user._id,
      createProductDto.storeId,
      req.user.role
    );
  }

  @Post('scan') // No guard here, assumes internal or different auth
  async scanAndAddProduct(
    @Body() createProductDto: CreateProductDto,
    @Request() req: any,
  ) {
    const ownerId = req.user.id;
    const storeId = createProductDto.storeId;
    const userRole = req.user.roles || [UserRoleEnum.STORE_OWNER];
    const product = await this.productService.scanAndAddProduct(createProductDto, ownerId, storeId, userRole);
    return { success: true, data: product, message: 'Product added successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('supply')
  async supplyProduct(@Body() supplyProductDto: SupplyProductDto, @Body('storeId') storeId: string, @Request() req) {
    return this.productService.supplyProduct(
      supplyProductDto.id,
      supplyProductDto.additionalQuantity,
      req.user._id,
      storeId,
      req.user.role,
    );
  }

  // --- GET ROUTES - SPECIFIC SEGMENTS FIRST ---

  @UseGuards(JwtAuthGuard)
  @Get('filter/:storeId')
  async getFilteredProducts(
    @Param('storeId') storeId: string,
    @Query() filterProductDto: FilterProductDto,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Request() req,
  ) {
    return this.productService.getFilteredProducts(filterProductDto, req.user._id, storeId, page, limit);
  }

  // @Get('by-code/:code/:storeId') // No guard, assumes internal or different auth
  // async getProductByCode(
  //   @Param('code') code: string,
  //   @Param('storeId') storeId: string,
  //   @Request() req: any,
  // ) {
  //   const ownerId = req.user.id;
  //   const product = await this.productService.searchProductByCode(code, ownerId, storeId);
  //   if (!product) {
  //     return { success: false, message: 'Product not found' };
  //   }
  //   return { success: true, data: product };
  // }

  @Get('check-code/:code/:storeId') // No guard, assumes internal or different auth
  async checkProductExistence(
    @Param('code') code: string,
    @Param('storeId') storeId: string,
    @Request() req: any,
  ) {
    const ownerId = req.user.id;
    const result = await this.productService.checkProductExistenceByCode(code, ownerId, storeId);
    return { success: true, data: { exists: result.exists }, message: 'Request completed successfully' };
  }
  // Add this endpoint
  @UseGuards(JwtAuthGuard)
  @Get('code/:code')
  async getProductByCode(@Param('code') code: string, @Query('storeId') storeId: string, @Request() req) {
    return this.productService.getProductByCode(code, storeId, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('expiring/:storeId')
  async getExpiringProducts(
    @Param('storeId') storeId: string,
    @Query() query: ExpiringProductsQueryDto,
    @Request() req,
  ) {
    console.log('*** ROUTING DEBUG: Entering getExpiringProducts controller method ***', { storeId, query, user: req.user });
    console.log('[ProductController][getExpiringProducts] Request received:', { storeId, query, user: req.user });
    return this.productService.getExpiringProducts(
      req.user._id,
      storeId,
      query.days || 30,
      query.page || 1,
      query.limit || 10,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('low-stock/:storeId')
  async getLowStockProducts(
    @Param('storeId') storeId: string,
    @Query() query: LowStockProductsQueryDto,
    @Request() req,
  ) {
    return this.productService.getLowStockProducts(
      req.user._id,
      storeId,
      query.threshold || 5,
      query.page || 1,
      query.limit || 10,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('total-stock/:storeId')
  async getTotalStock(@Param('storeId') storeId: string, @Request() req) {
    return this.productService.getTotalStock(req.user._id, storeId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('summary/:storeId')
  async getInventorySummary(@Param('storeId') storeId: string, @Request() req) {
    return this.productService.getInventorySummary(req.user._id, storeId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('expiring-and-low-stock/:storeId')
  async getExpiringAndLowStockProducts(
    @Param('storeId') storeId: string,
    @Query() query: ExpiringAndLowStockQueryDto,
    @Request() req,
  ) {
    return this.productService.getExpiringAndLowStockProducts(
      req.user._id,
      storeId,
      query.expiryDays || 30,
      query.stockThreshold || 5,
      query.page || 1,
      query.limit || 10,
    );
  }

  // --- GET ROUTES - GENERIC :ID SEGMENTS ---

  @UseGuards(JwtAuthGuard)
  @Get(':id/history/:storeId') // More specific than just :id/:storeId
  async getProductHistory(
    @Param('id') productId: string,
    @Param('storeId') storeId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Request() req,
  ) {
    return this.productService.getProductHistory(productId, storeId, req.user._id, page, limit);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/:storeId') // This should now be the *last* resort for two-segment paths
  async findOne(@Param('id') id: string, @Param('storeId') storeId: string, @Request() req) {
    console.log('*** ROUTING DEBUG: Entering findOne controller method (generic fallback) ***', { id, storeId }); // Updated log
    return this.productService.findOne(id, req.user._id, storeId);
  }

  // --- PATCH & DELETE ROUTES ---
  @UseGuards(JwtAuthGuard)
  @Patch(':id/:storeId') // Add :storeId to the path
  async updateProduct(
    @Param('id') id: string,
    @Param('storeId') storeId: string,
    @Body() updateProductDto: UpdateProductDto,
    @Request() req,
  ) {
    return this.productService.updateProduct(id, updateProductDto, req.user._id, storeId, req.user.role);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteProduct(@Param('id') id: string, @Body('storeId') storeId: string, @Request() req) {
    return this.productService.deleteProduct(id, req.user._id, storeId, req.user.role);
  }
}