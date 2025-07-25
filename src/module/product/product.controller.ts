
import { Controller, Get, Post, Patch, Delete, Body, Query, Param, Request, UseGuards, BadRequestException, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ProductService } from './product.service';
import { JwtAuthGuard } from '../auth/guard/jwtGuard';
import { CreateProductDto } from './dto/create-product.dto';
import { ExpiringAndLowStockQueryDto } from './dto/expiring-and-low-stock-query.dto';
import { ExpiringProductsQueryDto } from './dto/expiring-products-query.dto';
import { FilterProductDto } from './dto/filter-product.dto';
import { LowStockProductsQueryDto } from './dto/low-stock-products-query.dto';
import { SupplyProductDto } from './dto/supply-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UserRoleEnum } from 'src/common/enums/user.enum'; // Ensure correct path to UserRoleEnum
import { ProductMovementDto } from './dto/product-movement.dto';
import { User } from '../user/schema/user.schema';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) { }

  // --- ADD PRODUCT ENDPOINT ---
  @UseGuards(JwtAuthGuard)
  @Post(':storeId')
  @UseInterceptors(FileInterceptor('image')) // Changed to 'image'
  async addProduct(
    // NOTE: For FormData, NestJS puts ALL fields (including file-related ones) into req.body
    // So we'll access them from req.body directly, and construct the DTO
    @Param('storeId') storeId: string,
    @Request() req: { user: User, body: any }, // Access req.body directly
    @UploadedFile() file?: Express.Multer.File,
    // @Body('imageUrl') imageUrl?: string, // Remove this as it's redundant/problematic with file
  ) {
    const { name, description, price, quantity, category, expiryDate, code, brands, costPrice, size, minQuantity, imageUrl } = req.body;

    // Manually parse numbers, ensuring they are valid
    const parsedPrice = price !== undefined ? parseFloat(price) : undefined;
    const parsedQuantity = quantity !== undefined ? parseInt(quantity, 10) : undefined;
    const parsedCostPrice = costPrice !== undefined ? parseFloat(costPrice) : undefined;
    const parsedMinQuantity = minQuantity !== undefined ? parseInt(minQuantity, 10) : undefined;

    // Create a new DTO instance with parsed values
    const createProductDto: CreateProductDto = {
      name: name,
      description: description,
      price: parsedPrice,
      quantity: parsedQuantity,
      category: category,
      expiryDate: expiryDate,
      code: code,
      brands: Array.isArray(brands) ? brands : (brands ? [brands] : undefined),
      costPrice: parsedCostPrice,
      size: size,
      minQuantity: parsedMinQuantity,
      storeId: storeId,
      imageUrl: imageUrl
    };

    // If imageUrl is sent as an empty string or explicitly 'null', normalize it for service
    let finalImageUrl = imageUrl;
    if (finalImageUrl === '' || finalImageUrl === 'null') {
      finalImageUrl = undefined;
    }

    return this.productService.addProduct(createProductDto, req.user._id, storeId, req.user.role, finalImageUrl, file);
  }

  // --- SCAN AND ADD PRODUCT ENDPOINT (apply similar logic) ---
  @UseGuards(JwtAuthGuard)
  @Post('scan/:storeId')
  @UseInterceptors(FileInterceptor('image')) // Changed to 'image'
  async scanAndAddProduct(
    @Param('storeId') storeId: string,
    @Request() req: { user: User, body: any },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const { name, description, price, quantity, category, expiryDate, code, brands, costPrice, size, minQuantity, imageUrl } = req.body;

    const parsedPrice = price !== undefined ? parseFloat(price) : undefined;
    const parsedQuantity = quantity !== undefined ? parseInt(quantity, 10) : undefined;
    const parsedCostPrice = costPrice !== undefined ? parseFloat(costPrice) : undefined;
    const parsedMinQuantity = minQuantity !== undefined ? parseInt(minQuantity, 10) : undefined;

    const createProductDto: CreateProductDto = {
      name: name,
      description: description,
      price: parsedPrice,
      quantity: parsedQuantity,
      category: category,
      expiryDate: expiryDate,
      code: code,
      brands: Array.isArray(brands) ? brands : (brands ? [brands] : undefined),
      costPrice: parsedCostPrice,
      size: size,
      minQuantity: parsedMinQuantity,
      storeId: storeId,
      imageUrl: imageUrl
    };

    let finalImageUrl = imageUrl;
    if (finalImageUrl === '' || finalImageUrl === 'null') {
      finalImageUrl = undefined;
    }

    const product = await this.productService.scanAndAddProduct(
      createProductDto,
      req.user._id,
      storeId,
      req.user.role,
      finalImageUrl,
      file
    );
    return { success: true, data: product, message: 'Product added successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('supply')
  async supplyProduct(
    @Body() supplyProductDto: SupplyProductDto,
    @Body('storeId') storeId: string,
    @Request() req: { user: User }
  ) {
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
    @Request() req: { user: User },
  ) {
    return this.productService.getFilteredProducts(filterProductDto, req.user._id, storeId, page, limit);
  }

  @UseGuards(JwtAuthGuard)
  @Get('check-code/:code/:storeId')
  async checkProductExistence(
    @Param('code') code: string,
    @Param('storeId') storeId: string,
    @Request() req: { user: User },
  ) {
    const result = await this.productService.checkProductExistenceByCode(code, req.user._id, storeId);
    return { success: true, data: { exists: result.exists }, message: 'Request completed successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('code/:code')
  async getProductByCode(
    @Param('code') code: string,
    @Query('storeId') storeId: string,
    @Request() req: { user: User }
  ) {
    return this.productService.getProductByCode(code, storeId, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':storeId/send-out')
  async sendOutProduct(
    @Body() dto: ProductMovementDto,
    @Param('storeId') storeId: string,
    @Request() req: { user: User },
  ) {
    return this.productService.sendOutProduct(dto, req.user._id, storeId, req.user.role);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':storeId/receive')
  async receiveProduct(
    @Body() dto: ProductMovementDto,
    @Param('storeId') storeId: string,
    @Request() req: { user: User },
  ) {
    return this.productService.receiveProduct(dto, req.user._id, storeId, req.user.role);
  }

  @UseGuards(JwtAuthGuard)
  @Get('expiring/:storeId')
  async getExpiringProducts(
    @Param('storeId') storeId: string,
    @Query() query: ExpiringProductsQueryDto,
    @Request() req: { user: User },
  ) {
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
    @Request() req: { user: User },
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
  async getTotalStock(
    @Param('storeId') storeId: string,
    @Request() req: { user: User }
  ) {
    return this.productService.getTotalStock(req.user._id, storeId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('summary/:storeId')
  async getInventorySummary(
    @Param('storeId') storeId: string,
    @Request() req: { user: User }
  ) {
    // This now calls the optimized service method, which will return all three values.
    return this.productService.getInventorySummary(req.user._id, storeId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('expiring-and-low-stock/:storeId')
  async getExpiringAndLowStockProducts(
    @Param('storeId') storeId: string,
    @Query() query: ExpiringAndLowStockQueryDto,
    @Request() req: { user: User },
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
    @Request() req: { user: User },
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;
    return this.productService.getProductHistory(
      productId,
      req.user._id,
      storeId,
      req.user.role,
      pageNumber,
      limitNumber,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/:storeId')
  async findOne(
    @Param('id') id: string,
    @Param('storeId') storeId: string,
    @Request() req: { user: User }
  ) {
    console.log('[ProductController][findOne] Request received:', { id, storeId });
    return this.productService.findOne(id, req.user._id, storeId);
  }

  // --- UPDATE PRODUCT ENDPOINT ---
  @UseGuards(JwtAuthGuard)
  @Patch(':id/:storeId')
  @UseInterceptors(FileInterceptor('image')) // Changed to 'image'
  async updateProduct(
    @Param('id') id: string,
    @Param('storeId') storeId: string,
    @Request() req: { user: User, body: any }, // Access req.body directly
    @UploadedFile() file?: Express.Multer.File,
  ) {
    // Extract fields from req.body
    const { name, description, price, quantity, category, expiryDate, code, brands, costPrice, size, minQuantity, imageUrl } = req.body;

    // Manually parse numbers, handling optional fields and ensuring they are valid
    const parsedPrice = price !== undefined ? parseFloat(price) : undefined;
    const parsedQuantity = quantity !== undefined ? parseInt(quantity, 10) : undefined;
    const parsedCostPrice = costPrice !== undefined ? parseFloat(costPrice) : undefined;
    const parsedMinQuantity = minQuantity !== undefined ? parseInt(minQuantity, 10) : undefined;

    // Construct the UpdateProductDto
    const updateProductDto: UpdateProductDto = {
      name: name,
      description: description,
      price: parsedPrice,
      quantity: parsedQuantity,
      category: category,
      expiryDate: expiryDate,
      code: code,
      brands: Array.isArray(brands) ? brands : (brands ? [brands] : undefined),
      costPrice: parsedCostPrice,
      size: size,
      minQuantity: parsedMinQuantity,
      imageUrl: imageUrl // If client provides imageUrl in body for text fields
    };

    // If imageUrl is sent as an empty string or explicitly 'null', normalize it for service
    let finalImageUrl = imageUrl;
    if (finalImageUrl === '' || finalImageUrl === 'null') { // Handle both empty string and the string 'null'
      finalImageUrl = undefined;
    }

    // Call your service, passing the file and the potentially adjusted imageUrl
    return this.productService.updateProduct(
      id,
      updateProductDto,
      req.user._id,
      storeId,
      req.user.role,
      file,
      finalImageUrl // Pass this explicitly if your service expects it
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post(':storeId/:productId/image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadProductImage(
    @Param('storeId') storeId: string,
    @Param('productId') productId: string,
    @Request() req: { user: User },
    @UploadedFile() file?: Express.Multer.File,
    @Body('imageUrl') imageUrl?: string,
  ) {
    // If frontend sends null/empty string for imageUrl and no file, it means clear image
    if (!file && !imageUrl) { // Allow clearing by sending no file and no URL or explicit null
      imageUrl = null; // Normalize to null for service logic if both are empty/undefined
    } else if (imageUrl === '') { // Treat empty string URL as desire to clear
      imageUrl = null;
    }

    if (!file && imageUrl === null) {
      // If the intent is to clear the image, the service handles it.
      // No need to throw a BadRequestException here.
    } else if (!file && !imageUrl) {
      throw new BadRequestException('Either an image file or URL must be provided to set an image');
    }

    return this.productService.uploadProductImage(productId, storeId, req.user._id, file, imageUrl);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteProduct(
    @Param('id') id: string,
    @Body('storeId') storeId: string,
    @Request() req: { user: User }
  ) {
    if (!storeId) {
      console.error('[ProductController][deleteProduct] Missing storeId in request body');
      throw new BadRequestException('storeId is required in the request body');
    }
    return this.productService.deleteProduct(id, req.user._id, storeId, req.user.role);
  }
}