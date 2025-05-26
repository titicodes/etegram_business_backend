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

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @UseGuards(JwtAuthGuard)
  @Post('add')
  async addProduct(@Body() createProductDto: CreateProductDto, @Body('storeId') storeId: string, @Request() req) {
    return this.productService.addProduct(createProductDto, req.user._id, storeId, req.user.role);
  }

  @UseGuards(JwtAuthGuard)
  @Post('scan')
  async scanAndAddProduct(@Body() createProductDto: CreateProductDto, @Body('storeId') storeId: string, @Request() req) {
    return this.productService.scanAndAddProduct(createProductDto, req.user._id, storeId, req.user.role);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async updateProduct(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @Body('storeId') storeId: string,
    @Request() req,
  ) {
    return this.productService.updateProduct(id, updateProductDto, req.user._id, storeId, req.user.role);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteProduct(@Param('id') id: string, @Body('storeId') storeId: string, @Request() req) {
    return this.productService.deleteProduct(id, req.user._id, storeId, req.user.role);
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

  @UseGuards(JwtAuthGuard)
  @Get(':id/:storeId')
  async findOne(@Param('id') id: string, @Param('storeId') storeId: string, @Request() req) {
    return this.productService.findOne(id, req.user._id, storeId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('code/:code/:storeId')
  async searchProductByCode(@Param('code') code: string, @Param('storeId') storeId: string, @Request() req) {
    return this.productService.searchProductByCode(code, req.user._id, storeId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('check-code/:code/:storeId')
  async checkProductExistenceByCode(@Param('code') code: string, @Param('storeId') storeId: string, @Request() req) {
    return this.productService.checkProductExistenceByCode(code, req.user._id, storeId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('expiring/:storeId')
  async getExpiringProducts(
    @Param('storeId') storeId: string,
    @Query() query: ExpiringProductsQueryDto,
    @Request() req,
  ) {
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

  @UseGuards(JwtAuthGuard)
  @Get(':id/history/:storeId')
  async getProductHistory(
    @Param('id') productId: string,
    @Param('storeId') storeId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Request() req,
  ) {
    return this.productService.getProductHistory(productId, storeId, req.user._id, page, limit);
  }
}