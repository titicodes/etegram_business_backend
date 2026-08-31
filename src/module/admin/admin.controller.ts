import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminService } from './admin.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { CreateStoreDto } from '../store/dto/create-store.dto';
import { UpdateStoreDto } from '../store/dto/update-store.dto';
import { CreateProductDto } from '../product/dto/create-product.dto';
import { UpdateProductDto } from '../product/dto/update-product.dto';
import { FilterProductDto } from '../product/dto/filter-product.dto';
import { User } from '../user/schema/user.schema';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Product, ProductDocument } from '../product/schema/product.schema';
import { Store } from '../store/schema/store.schema'; // Use Store class instead of StoreDocument
import {
  Subscription,
  SubscriptionDocument,
} from '../subscription/schema/subscription.schema';
import { Checkout } from '../checkout/schema/checkout.schema'; // Use Checkout class instead of CheckoutDocument
import { JwtAuthGuard } from '../auth/guard/jwtGuard';

@Controller('admin')
@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('users')
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: User,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async createUser(
    @Body() dto: CreateUserDto,
    @Request() req: { user: User },
  ): Promise<User> {
    return this.adminService.createUser(dto, req.user);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
    type: User,
  })
  @ApiResponse({ status: 400, description: 'Invalid user ID' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(
    @Param('id') id: string,
    @Request() req: { user: User },
  ): Promise<User> {
    return this.adminService.getUserById(id, req.user);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Update user by ID' })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: User,
  })
  @ApiResponse({ status: 400, description: 'Invalid user ID or data' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUser(
    @Param('id') id: string,
    @Body() updateDto: Partial<CreateUserDto>,
    @Request() req: { user: User },
  ): Promise<User> {
    return this.adminService.updateUser(id, updateDto, req.user);
  }

  @Post('stores')
  @ApiOperation({ summary: 'Create a new store' })
  @ApiResponse({
    status: 201,
    description: 'Store created successfully',
    type: Store,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 409, description: 'Store name already exists' })
  async createStore(
    @Body() dto: CreateStoreDto,
    @Body('ownerId') ownerId: string,
    @Request() req: { user: User },
  ): Promise<Store> {
    return this.adminService.createStore(dto, ownerId, req.user);
  }

  @Post('stores/branch')
  @ApiOperation({ summary: 'Create a store branch' })
  @ApiResponse({
    status: 201,
    description: 'Branch created successfully',
    type: Store,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 404, description: 'Parent store not found' })
  @ApiResponse({ status: 409, description: 'Branch name already exists' })
  async createStoreBranch(
    @Body() dto: CreateStoreDto,
    @Body('ownerId') ownerId: string,
    @Body('parentStoreId') parentStoreId: string,
    @Request() req: { user: User },
  ): Promise<Store> {
    return this.adminService.createStoreBranch(
      dto,
      ownerId,
      parentStoreId,
      req.user,
    );
  }

  @Get('stores/owner/:ownerId')
  @ApiOperation({ summary: 'Get stores by owner' })
  @ApiResponse({
    status: 200,
    description: 'Stores retrieved successfully',
    type: [Store],
  })
  @ApiResponse({ status: 400, description: 'Invalid owner ID' })
  async getStoresByOwner(
    @Param('ownerId') ownerId: string,
    @Request() req: { user: User },
  ): Promise<Store[]> {
    return this.adminService.getStoresByOwner(ownerId, req.user);
  }

  @Get('stores/:id')
  @ApiOperation({ summary: 'Get store by ID' })
  @ApiResponse({
    status: 200,
    description: 'Store retrieved successfully',
    type: Store,
  })
  @ApiResponse({ status: 400, description: 'Invalid store ID' })
  @ApiResponse({ status: 404, description: 'Store not found' })
  async getStoreById(
    @Param('id') id: string,
    @Request() req: { user: User },
  ): Promise<Store> {
    return this.adminService.getStoreById(id, req.user);
  }

  @Patch('stores/:id')
  @ApiOperation({ summary: 'Update store' })
  @ApiResponse({
    status: 200,
    description: 'Store updated successfully',
    type: Store,
  })
  @ApiResponse({ status: 400, description: 'Invalid store ID or data' })
  @ApiResponse({ status: 404, description: 'Store not found' })
  async updateStore(
    @Param('id') id: string,
    @Body() dto: UpdateStoreDto,
    @Request() req: { user: User },
  ): Promise<Store> {
    return this.adminService.updateStore(id, dto, req.user);
  }

  @Delete('stores/:id')
  @ApiOperation({ summary: 'Delete store' })
  @ApiResponse({ status: 200, description: 'Store deleted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid store ID' })
  @ApiResponse({ status: 404, description: 'Store not found' })
  async deleteStore(
    @Param('id') id: string,
    @Request() req: { user: User },
  ): Promise<void> {
    return this.adminService.deleteStore(id, req.user);
  }

  @Post('products/:storeId')
  @ApiOperation({ summary: 'Add a new product' })
  @ApiResponse({
    status: 201,
    description: 'Product created successfully',
    type: Product,
  })
  @ApiResponse({ status: 400, description: 'Invalid input or store ID' })
  @ApiResponse({ status: 401, description: 'Unauthorized access' })
  @ApiResponse({ status: 409, description: 'Product code already exists' })
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        code: { type: 'string' },
        price: { type: 'number' },
        costPrice: { type: 'number' },
        quantity: { type: 'number' },
        description: { type: 'string' },
        category: { type: 'string' },
        storeId: { type: 'string' },
        file: { type: 'string', format: 'binary' },
      },
      required: ['name', 'code', 'price', 'quantity', 'storeId'],
    },
  })
  async createProduct(
    @Body() dto: CreateProductDto,
    @Param('storeId') storeId: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: { user: User },
  ): Promise<ProductDocument> {
    return this.adminService.createProduct(dto, storeId, file, req.user);
  }

  @Get('products/:id/:storeId')
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiResponse({
    status: 200,
    description: 'Product retrieved successfully',
    type: Product,
  })
  @ApiResponse({ status: 400, description: 'Invalid product or store ID' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getProductById(
    @Param('id') id: string,
    @Param('storeId') storeId: string,
    @Request() req: { user: User },
  ): Promise<ProductDocument> {
    return this.adminService.getProductById(id, storeId, req.user);
  }

  @Patch('products/:id/:storeId')
  @ApiOperation({ summary: 'Update product' })
  @ApiResponse({
    status: 200,
    description: 'Product updated successfully',
    type: Product,
  })
  @ApiResponse({ status: 400, description: 'Invalid product or store ID' })
  @ApiResponse({ status: 401, description: 'Unauthorized access' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async updateProduct(
    @Param('id') id: string,
    @Param('storeId') storeId: string,
    @Body() dto: UpdateProductDto,
    @Request() req: { user: User },
  ): Promise<ProductDocument> {
    return this.adminService.updateProduct(id, storeId, dto, req.user);
  }

  @Delete('products/:id')
  @ApiOperation({ summary: 'Delete product' })
  @ApiResponse({ status: 200, description: 'Product deleted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid product or store ID' })
  @ApiResponse({ status: 401, description: 'Unauthorized access' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async deleteProduct(
    @Param('id') id: string,
    @Body('storeId') storeId: string,
    @Request() req: { user: User },
  ): Promise<void> {
    return this.adminService.deleteProduct(id, storeId, req.user);
  }

  @Get('products/filter/:storeId')
  @ApiOperation({ summary: 'Get filtered products' })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid store ID or filter parameters',
  })
  async getProductsFiltered(
    @Param('storeId') storeId: string,
    @Query() filter: FilterProductDto,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Request() req: { user: User },
  ): Promise<{
    data: ProductDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.adminService.getProductsFiltered(
      storeId,
      { ...filter, page, limit },
      req.user,
    );
  }

  @Post('subscriptions')
  @ApiOperation({ summary: 'Create a new subscription' })
  @ApiResponse({
    status: 201,
    description: 'Subscription created successfully',
    type: Subscription,
  })
  @ApiResponse({ status: 400, description: 'Invalid user ID' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async createSubscription(
    @Body('userId') userId: string,
    @Request() req: { user: User },
  ): Promise<SubscriptionDocument> {
    return this.adminService.createSubscription(userId, req.user);
  }

  @Post('subscriptions/:userId/premium')
  @ApiOperation({ summary: 'Subscribe user to premium plan' })
  @ApiResponse({
    status: 200,
    description: 'User subscribed to premium successfully',
    type: Subscription,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid user ID or subscription type',
  })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async subscribeToPremium(
    @Param('userId') userId: string,
    @Body('subscriptionType') subscriptionType: 'MONTHLY' | 'YEARLY',
    @Request() req: { user: User },
  ): Promise<SubscriptionDocument> {
    return this.adminService.subscribeToPremium(
      userId,
      subscriptionType,
      req.user,
    );
  }

  @Get('subscriptions/:userId')
  @ApiOperation({ summary: 'Get subscription status' })
  @ApiResponse({
    status: 200,
    description: 'Subscription status retrieved successfully',
    type: Subscription,
  })
  @ApiResponse({ status: 400, description: 'Invalid user ID' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async getSubscriptionStatus(
    @Param('userId') userId: string,
    @Request() req: { user: User },
  ): Promise<SubscriptionDocument> {
    return this.adminService.getSubscriptionStatus(userId, req.user);
  }

  @Delete('subscriptions/:userId')
  @ApiOperation({ summary: 'Cancel subscription' })
  @ApiResponse({
    status: 200,
    description: 'Subscription canceled successfully',
    type: Subscription,
  })
  @ApiResponse({ status: 400, description: 'Invalid user ID' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async cancelSubscription(
    @Param('userId') userId: string,
    @Request() req: { user: User },
  ): Promise<SubscriptionDocument> {
    return this.adminService.cancelSubscription(userId, req.user);
  }

  @Get('checkouts/sales')
  @ApiOperation({ summary: 'Get sales history' })
  @ApiResponse({
    status: 200,
    description: 'Sales history retrieved successfully',
    type: [Checkout],
  })
  @ApiResponse({ status: 400, description: 'Invalid store or product ID' })
  @ApiResponse({ status: 401, description: 'Unauthorized access' })
  @ApiResponse({ status: 404, description: 'Store not found' })
  async getSalesHistory(
    @Query('storeId') storeId: string,
    @Query('productId') productId: string,
    @Request() req: { user: User },
  ): Promise<Checkout[]> {
    return this.adminService.getSalesHistory(storeId, productId, req.user);
  }

  @Get('checkouts/owing')
  @ApiOperation({ summary: 'Get owing records' })
  @ApiResponse({
    status: 200,
    description: 'Owing records retrieved successfully',
    type: [Checkout],
  })
  @ApiResponse({ status: 400, description: 'Invalid store or supplier ID' })
  @ApiResponse({ status: 401, description: 'Unauthorized access' })
  @ApiResponse({ status: 404, description: 'Store not found' })
  async getOwingRecords(
    @Query('storeId') storeId: string,
    @Query('supplierId') supplierId: string,
    @Request() req: { user: User },
  ): Promise<Checkout[]> {
    return this.adminService.getOwingRecords(storeId, supplierId, req.user);
  }

  @Get('checkouts/owed')
  @ApiOperation({ summary: 'Get owed records' })
  @ApiResponse({
    status: 200,
    description: 'Owed records retrieved successfully',
    type: [Checkout],
  })
  @ApiResponse({ status: 400, description: 'Invalid store or customer ID' })
  @ApiResponse({ status: 401, description: 'Unauthorized access' })
  @ApiResponse({ status: 404, description: 'Store not found' })
  async getOwedRecords(
    @Query('storeId') storeId: string,
    @Query('customerId') customerId: string,
    @Request() req: { user: User },
  ): Promise<Checkout[]> {
    return this.adminService.getOwedRecords(storeId, customerId, req.user);
  }

  @Patch('checkouts/:orderId/status')
  @ApiOperation({ summary: 'Update order status' })
  @ApiResponse({
    status: 200,
    description: 'Order status updated successfully',
    type: Checkout,
  })
  @ApiResponse({ status: 400, description: 'Invalid order ID or status' })
  @ApiResponse({ status: 401, description: 'Unauthorized access' })
  @ApiResponse({ status: 404, description: 'Order or store not found' })
  async updateOrderStatus(
    @Param('orderId') orderId: string,
    @Body('status') status: 'Processing' | 'Completed',
    @Request() req: { user: User },
  ): Promise<Checkout> {
    return this.adminService.updateOrderStatus(orderId, status, req.user);
  }
}
