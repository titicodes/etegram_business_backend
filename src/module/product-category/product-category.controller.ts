import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProductCategory } from './schema/product-category.schema';
import { ProductCategoriesService } from './product-category.service';

@Controller('product-categories')
export class ProductCategoriesController {
  constructor(
    private readonly productCategoriesService: ProductCategoriesService,
  ) {}

  @Get()
  async findAll(): Promise<ProductCategory[]> {
    return this.productCategoriesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ProductCategory> {
    return this.productCategoriesService.findOne(id);
  }

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createCategoryDto: any): Promise<ProductCategory> {
    return this.productCategoriesService.create(createCategoryDto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCategoryDto: any,
  ): Promise<ProductCategory> {
    return this.productCategoriesService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.productCategoriesService.remove(id);
  }
}
