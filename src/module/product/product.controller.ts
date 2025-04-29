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
import { PaginationQueryDto } from './dto/pagination-querry.dto';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductController {
  constructor(private readonly productService: ProductService) { }

  /**
   * 🔍 Search products using name, category, or keyword
   */
  @Get('search')
  async searchProducts(@Query() filterProductDTO: FilterProductDTO): Promise<any> {
    return this.productService.getFilteredProducts(filterProductDTO, 1, 10);
  }

  /**
   * ➕ Add a new product (Manual Entry)
   */
  @Post()
  async createProduct(@Body() createProductDto: CreateProductDto, @Req() req): Promise<Product> {
    return this.productService.addProduct(createProductDto, req.user._id.toString());
  }

  /**
   * ✏️ Update an existing product
   */
  @Put(':id')
  async updateProduct(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @Req() req, // Inject the Request object
  ): Promise<Product> {
    return this.productService.updateProduct(id, updateProductDto, req.user._id.toString()); // Pass userId
  }

  /**
   * ❌ Delete a product
   */
  @Delete(':id')
  async deleteProduct(@Param('id') id: string, @Req() req): Promise<{ deleted: boolean }> { // Inject the Request object
    return this.productService.deleteProduct(id, req.user._id.toString()); // Pass userId
  }

  /**
   * 🚀 Supply an existing product (Increase stock)
   */
  @Patch(':id/supply')
  async supplyProduct(
    @Param('id') id: string,
    @Body('stock') additionalStock: number,
  ): Promise<Product> {
    return this.productService.supplyProduct(id, additionalStock); // Supply doesn't seem to be owner-specific
  }

  /**
   * 📷 Scan & Add a new product
   */
  @Post('scan-and-add')
  async createScannedProduct(
    @Body() dto: CreateProductDto, // Expecting storeId in the DTO
    @Req() req,
  ) {
    return this.productService.addProduct(dto, req.user._id.toString());
  }

  @Get()
  async getAllProducts(
    @Query() paginationQuery: PaginationQueryDto,
    @Req() req,
  ) {
    const { page, limit } = paginationQuery;
    //const storeId = req.user.storeId; // or wherever you're storing the storeId
    return this.productService.findAll(req.user._id.toString(), page, limit);
  }


  @Get('expiring')
  async getExpiringProducts(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.productService.getExpiringProducts(page, limit);
  }

  @Get('low-stock')
  async getLowStockProducts(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.productService.getLowStockProducts(page, limit);
  }

  @Get('by-code/:code')
  async getProductByBarcode(@Param('code') code: string): Promise<Product> {
    return this.productService.getProductByBarcode(code);
  }

  /**
   * ➕ Add a new product (Manual entry, optional scanning) - Consider renaming for clarity
   */
  @Post('manual-add')
  @UseGuards(JwtAuthGuard)
  async createManualProduct(@Body() createProductDto: CreateProductDto, @Req() req): Promise<Product> {
    return this.productService.addProduct(createProductDto, req.user._id.toString());
  }


  @Get('inventory-summary')
  async getInventorySummary(): Promise<{
    totalCost: number;
    totalSellingPrice: number;
    totalStock: number;
  }> {
    return this.productService.getInventorySummary();
  }

  /**
   * 🆔 Get a single product by ID
   */
  @Get(':id')
  async getProduct(@Param('id') id: string): Promise<Product> {
    return this.productService.findOne(id); // Consider adding owner check here if needed
  }
}