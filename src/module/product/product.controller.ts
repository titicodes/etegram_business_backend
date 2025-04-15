// products/product.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  NotFoundException,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FilterProductDTO } from './dto/filter-product.dto';
import { Product } from './schema/product.schema';
import { JwtAuthGuard } from '../auth/guard/jwtGuard';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) { }

  /**
   * 🔍 Search products using name, category, or keyword
   */
  @Get('search')
  async searchProducts(@Query() filterProductDTO: FilterProductDTO): Promise<any> { // Updated return type
    return this.productService.getFilteredProducts(filterProductDTO);
  }

  /**
   * ➕ Add a new product (Scanning required for new products)
   */
  @Post()
  async createProduct(@Body() createProductDto: CreateProductDto, @Req() req): Promise<Product> {
    return this.productService.addProduct(createProductDto, req.user._id);
  }

  /**
   * ✏️ Update an existing product
   */
  @Put(':id')
  async updateProduct(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto): Promise<Product> {
    return this.productService.updateProduct(id, updateProductDto);
  }

  /**
   * ❌ Delete a product
   */
  @Delete(':id')
  async deleteProduct(@Param('id') id: string): Promise<{ deleted: boolean }> {
    return this.productService.deleteProduct(id);
  }

  /**
   * 🚀 Supply an existing product (Increase stock)
   */
  @Patch(':id/supply')
  async supplyProduct(
    @Param('id') id: string,
    @Body('stock') additionalStock: number,
  ): Promise<Product> {
    return this.productService.supplyProduct(id, additionalStock);
  }

  /**
   * 📷 Scan & Add a new product if it does not exist in the search
   */
  @Post('scan-and-add')

  @UseGuards(JwtAuthGuard)
  async create(@Body() dto: CreateProductDto, @Req() req) {
    return this.productService.addProduct(dto, req.user._id);
  }


  @Get()
  getAllProducts(@Query('page') page: number, @Query('limit') limit: number) {
    return this.productService.getAllProducts(page, limit);
  }

  @Get('expiring')
  async getExpiringProducts(@Query('page') page: number, @Query('limit') limit: number) {
    return this.productService.getExpiringProducts(page, limit);
  }

  @Get('low-stock')
  async getLowStockProducts(@Query('page') page: number, @Query('limit') limit: number) {
    return this.productService.getLowStockProducts(page, limit);
  }

  @Get('by-code/:code')
  async getProductByBarcode(@Param('code') code: string): Promise<Product> {
    return this.productService.getProductByBarcode(code);
  }

  /**
  * 🆔 Get a single product by ID
  */
  @Get(':id')
  async getProduct(@Param('id') id: string): Promise<Product> {
    return this.productService.findOne(id);
  }

}