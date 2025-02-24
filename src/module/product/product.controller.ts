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
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FilterProductDTO } from './dto/filter-product.dto';
import { Product } from './schema/product.schema';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) { }

  @Get()
  async getProducts(
    @Query() filterProductDTO: FilterProductDTO,
  ): Promise<Product[]> {
    return this.productService.getFilteredProducts(filterProductDTO);
  }

  @Get(':id')
  async getProduct(@Param('id') id: string): Promise<Product> {
    const product = await this.productService.findOne(id);
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  @Post()
  async createProduct(
    @Body() createProductDto: CreateProductDto,
  ): Promise<Product> {
    return this.productService.addProduct(createProductDto);
  }

  @Put(':id')
  async updateProduct(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    return this.productService.updateProduct(id, updateProductDto);
  }

  @Delete(':id')
  async deleteProduct(@Param('id') id: string): Promise<{ deleted: boolean }> {
    return this.productService.deleteProduct(id);
  }

  @Post('scan')
  async scanAndAddProduct(
    @Body() createProductDto: CreateProductDto,
  ): Promise<Product> {
    return this.productService.scanAndAddProduct(createProductDto);
  }

  @Get()
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.productService.findAll(page, limit);
  }

}
