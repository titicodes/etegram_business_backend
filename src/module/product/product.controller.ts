// import { Controller, Get, Post, Patch, Delete, Body, Query, Param, Request, UseGuards, BadRequestException, UseInterceptors, UploadedFile } from '@nestjs/common';
// import { ProductService } from './product.service';
// import { JwtAuthGuard } from '../auth/guard/jwtGuard';
// import { CreateProductDto } from './dto/create-product.dto';
// import { ExpiringAndLowStockQueryDto } from './dto/expiring-and-low-stock-query.dto';
// import { ExpiringProductsQueryDto } from './dto/expiring-products-query.dto';
// import { FilterProductDto } from './dto/filter-product.dto';
// import { LowStockProductsQueryDto } from './dto/low-stock-products-query.dto';
// import { SupplyProductDto } from './dto/supply-product.dto';
// import { UpdateProductDto } from './dto/update-product.dto';
// import { UserRoleEnum } from 'src/common/enums/user.enum';
// import { ProductMovementDto } from './dto/product-movement.dto';
// import { User } from '../user/schema/user.schema';
// import { FileInterceptor } from '@nestjs/platform-express';

// @Controller('products')
// export class ProductController {
//   constructor(private readonly productService: ProductService) { }

//   // --- POST ROUTES ---
//   // @UseGuards(JwtAuthGuard)
//   // @Post('add')
//   // async addProduct(@Body() createProductDto: CreateProductDto, @Request() req) {
//   //   return this.productService.addProduct(
//   //     createProductDto,
//   //     req.user._id,
//   //     createProductDto.storeId,
//   //     req.user.role
//   //   );
//   // }

//    @Post(':storeId')
//   @UseInterceptors(FileInterceptor('file'))
//   async addProduct(
//     @Body() dto: CreateProductDto,
//     @Param('storeId') storeId: string,
//     @Request() req: { user: User },
//     @UploadedFile() file?: Express.Multer.File,
//     @Body('imageUrl') imageUrl?: string,
//   ) {
//     return this.productService.addProduct(dto, req.user._id, storeId, req.user.role, imageUrl, file);
//   }


//   @Post('scan') // No guard here, assumes internal or different auth
//   async scanAndAddProduct(
//     @Body() createProductDto: CreateProductDto,
//     @Request() req: any,
//   ) {
//     const ownerId = req.user.id;
//     const storeId = createProductDto.storeId;
//     const userRole = req.user.roles || [UserRoleEnum.STORE_OWNER];
//     const product = await this.productService.scanAndAddProduct(createProductDto, ownerId, storeId, userRole);
//     return { success: true, data: product, message: 'Product added successfully' };
//   }

//   @UseGuards(JwtAuthGuard)
//   @Post('supply')
//   async supplyProduct(@Body() supplyProductDto: SupplyProductDto, @Body('storeId') storeId: string, @Request() req) {
//     return this.productService.supplyProduct(
//       supplyProductDto.id,
//       supplyProductDto.additionalQuantity,
//       req.user._id,
//       storeId,
//       req.user.role,
//     );
//   }

//   // --- GET ROUTES - SPECIFIC SEGMENTS FIRST ---

//   @UseGuards(JwtAuthGuard)
//   @Get('filter/:storeId')
//   async getFilteredProducts(
//     @Param('storeId') storeId: string,
//     @Query() filterProductDto: FilterProductDto,
//     @Query('page') page: number = 1,
//     @Query('limit') limit: number = 10,
//     @Request() req,
//   ) {
//     return this.productService.getFilteredProducts(filterProductDto, req.user._id, storeId, page, limit);
//   }


//   @Get('check-code/:code/:storeId') // No guard, assumes internal or different auth
//   async checkProductExistence(
//     @Param('code') code: string,
//     @Param('storeId') storeId: string,
//     @Request() req: any,
//   ) {
//     const ownerId = req.user.id;
//     const result = await this.productService.checkProductExistenceByCode(code, ownerId, storeId);
//     return { success: true, data: { exists: result.exists }, message: 'Request completed successfully' };
//   }
//   // Add this endpoint
//   @UseGuards(JwtAuthGuard)
//   @Get('code/:code')
//   async getProductByCode(@Param('code') code: string, @Query('storeId') storeId: string, @Request() req) {
//     return this.productService.getProductByCode(code, storeId, req.user);
//   }


//   @Post(':storeId/send-out')
//   async sendOutProduct(
//     @Body() dto: ProductMovementDto,
//     @Param('storeId') storeId: string,
//     @Request() req: { user: User },
//   ) {
//     return this.productService.sendOutProduct(dto, req.user._id, storeId, req.user.role);
//   }

//   @Post(':storeId/receive')
//   async receiveProduct(
//     @Body() dto: ProductMovementDto,
//     @Param('storeId') storeId: string,
//     @Request() req: { user: User },
//   ) {
//     return this.productService.receiveProduct(dto, req.user._id, storeId, req.user.role);
//   }

//   @UseGuards(JwtAuthGuard)
//   @Get('expiring/:storeId')
//   async getExpiringProducts(
//     @Param('storeId') storeId: string,
//     @Query() query: ExpiringProductsQueryDto,
//     @Request() req,
//   ) {
//     console.log('*** ROUTING DEBUG: Entering getExpiringProducts controller method ***', { storeId, query, user: req.user });
//     console.log('[ProductController][getExpiringProducts] Request received:', { storeId, query, user: req.user });
//     return this.productService.getExpiringProducts(
//       req.user._id,
//       storeId,
//       query.days || 30,
//       query.page || 1,
//       query.limit || 10,
//     );
//   }

//   @UseGuards(JwtAuthGuard)
//   @Get('low-stock/:storeId')
//   async getLowStockProducts(
//     @Param('storeId') storeId: string,
//     @Query() query: LowStockProductsQueryDto,
//     @Request() req,
//   ) {
//     return this.productService.getLowStockProducts(
//       req.user._id,
//       storeId,
//       query.threshold || 5,
//       query.page || 1,
//       query.limit || 10,
//     );
//   }

//   @UseGuards(JwtAuthGuard)
//   @Get('total-stock/:storeId')
//   async getTotalStock(@Param('storeId') storeId: string, @Request() req) {
//     return this.productService.getTotalStock(req.user._id, storeId);
//   }

//   @UseGuards(JwtAuthGuard)
//   @Get('summary/:storeId')
//   async getInventorySummary(@Param('storeId') storeId: string, @Request() req) {
//     return this.productService.getInventorySummary(req.user._id, storeId);
//   }

//   @UseGuards(JwtAuthGuard)
//   @Get('expiring-and-low-stock/:storeId')
//   async getExpiringAndLowStockProducts(
//     @Param('storeId') storeId: string,
//     @Query() query: ExpiringAndLowStockQueryDto,
//     @Request() req,
//   ) {
//     return this.productService.getExpiringAndLowStockProducts(
//       req.user._id,
//       storeId,
//       query.expiryDays || 30,
//       query.stockThreshold || 5,
//       query.page || 1,
//       query.limit || 10,
//     );
//   }

//   // --- GET ROUTES - GENERIC :ID SEGMENTS ---

//   @UseGuards(JwtAuthGuard)
//   @Get(':id/history/:storeId')
//   async getProductHistory(
//     @Param('id') productId: string,
//     @Param('storeId') storeId: string,
//     @Request() req,
//     @Query('page') page: string = '1',
//     @Query('limit') limit: string = '10',
//   ) {
//     const pageNumber = parseInt(page, 10) || 1;
//     const limitNumber = parseInt(limit, 10) || 10;
//     return this.productService.getProductHistory(
//       productId,
//       req.user._id,
//       storeId,
//       req.user.role,
//       pageNumber,
//       limitNumber,
//     );
//   }
//   @UseGuards(JwtAuthGuard)
//   @Get(':id/:storeId')
//   async findOne(@Param('id') id: string, @Param('storeId') storeId: string, @Request() req) {
//     console.log('*** ROUTING DEBUG: Entering findOne controller method (generic fallback) ***', { id, storeId });
//     return this.productService.findOne(id, req.user._id, storeId);
//   }

//   // --- PATCH & DELETE ROUTES ---
//   @UseGuards(JwtAuthGuard)
//   @Patch(':id/:storeId') // Add :storeId to the path
//   async updateProduct(
//     @Param('id') id: string,
//     @Param('storeId') storeId: string,
//     @Body() updateProductDto: UpdateProductDto,
//     @Request() req,
//   ) {
//     return this.productService.updateProduct(id, updateProductDto, req.user._id, storeId, req.user.role);
//   }

//   @Post(':storeId/:productId/image')
//   @UseInterceptors(FileInterceptor('file'))
//   async uploadProductImage(
//     @Param('storeId') storeId: string,
//     @Param('productId') productId: string,
//     @Request() req: { user: User },
//     @UploadedFile() file: Express.Multer.File,
//   ) {
//     if (!file) {
//       throw new BadRequestException('No file uploaded');
//     }
//     return this.productService.uploadProductImage(productId, storeId, req.user._id, file);
//   }

//   @UseGuards(JwtAuthGuard)
//   @Delete(':id')
//   async deleteProduct(@Param('id') id: string, @Body('storeId') storeId: string, @Request() req) {
//     if (!storeId) {
//       console.error('[ProductController][deleteProduct] Missing storeId in request body');
//       throw new BadRequestException('storeId is required in the request body');
//     }
//     return this.productService.deleteProduct(id, req.user._id, storeId, req.user.role);
//   }
// }

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
import { UserRoleEnum } from 'src/common/enums/user.enum';
import { ProductMovementDto } from './dto/product-movement.dto';
import { User } from '../user/schema/user.schema';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) { }

  @UseGuards(JwtAuthGuard)
  @Post(':storeId')
  @UseInterceptors(FileInterceptor('file'))
  async addProduct(
    @Body() dto: CreateProductDto,
    @Param('storeId') storeId: string,
    @Request() req: { user: User },
    @UploadedFile() file?: Express.Multer.File,
    @Body('imageUrl') imageUrl?: string,
  ) {
    return this.productService.addProduct(dto, req.user._id, storeId, req.user.role, imageUrl, file);
  }

  @UseGuards(JwtAuthGuard)
  @Post('scan/:storeId')
  @UseInterceptors(FileInterceptor('file'))
  async scanAndAddProduct(
    @Body() createProductDto: CreateProductDto,
    @Param('storeId') storeId: string,
    @Request() req: { user: User },
    @UploadedFile() file?: Express.Multer.File,
    @Body('imageUrl') imageUrl?: string,
  ) {
    const product = await this.productService.scanAndAddProduct(
      createProductDto,
      req.user._id,
      storeId,
      req.user.role,
      imageUrl,
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

  @UseGuards(JwtAuthGuard)
  @Patch(':id/:storeId')
  async updateProduct(
    @Param('id') id: string,
    @Param('storeId') storeId: string,
    @Body() updateProductDto: UpdateProductDto,
    @Request() req: { user: User },
  ) {
    return this.productService.updateProduct(id, updateProductDto, req.user._id, storeId, req.user.role);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':storeId/:productId/image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadProductImage(
    @Param('storeId') storeId: string,
    @Param('productId') productId: string,
    @Request() req: { user: User },
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.productService.uploadProductImage(productId, storeId, req.user._id, file);
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