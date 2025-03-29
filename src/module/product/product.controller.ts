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
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FilterProductDTO } from './dto/filter-product.dto';
import { Product } from './schema/product.schema';

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
   * 📦 Get all products with pagination
   */
  @Get('all')
  async findAll(@Query('page') page: number = 1, @Query('limit') limit: number = 10) {
    return this.productService.findAll(page, limit);
  }

  /**
   * 🆔 Get a single product by ID
   */
  @Get(':id')
  async getProduct(@Param('id') id: string): Promise<Product> {
    console.log('Received ID:', id); // ✅ Check if the ID is correct
    return this.productService.findOne(id);
  }

  /**
   * ➕ Add a new product (Scanning required for new products)
   */
  @Post()
  async createProduct(@Body() createProductDto: CreateProductDto): Promise<Product> {
    return this.productService.addProduct(createProductDto);
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
  async scanAndAddProduct(@Body() createProductDto: CreateProductDto): Promise<Product> {
    return this.productService.scanAndAddProduct(createProductDto);
  }

  @Get()
  getAllProducts(@Query('page') page: number, @Query('limit') limit: number) {
    return this.productService.getAllProducts(page, limit);
  }

  @Get('expiring')
  getExpiringProducts() {
    return this.productService.getExpiringProducts();
  }

  @Get('low-stock')
  getLowStockProducts() {
    return this.productService.getLowStockProducts();
  }
}