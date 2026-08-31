import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from '../user/user.service';
import { ProductService } from '../product/product.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { StoreService } from '../store/store.service';
import { CheckoutService } from '../checkout/checkout.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { CreateStoreDto } from '../store/dto/create-store.dto';
import { UpdateStoreDto } from '../store/dto/update-store.dto';
import { CreateProductDto } from '../product/dto/create-product.dto';
import { UpdateProductDto } from '../product/dto/update-product.dto';
import { FilterProductDto } from '../product/dto/filter-product.dto';
import { Types } from 'mongoose';
import { User } from '../user/schema/user.schema';
import { ProductDocument } from '../product/schema/product.schema';
import { SubscriptionDocument } from '../subscription/schema/subscription.schema';
import { Store } from '../store/schema/store.schema';
import { Checkout } from '../checkout/schema/checkout.schema';
import { UserRoleEnum } from 'src/common/enums/user.enum';

@Injectable()
export class AdminService {
  constructor(
    private readonly userService: UserService,
    private readonly productService: ProductService,
    private readonly subscriptionService: SubscriptionService,
    private readonly storeService: StoreService,
    private readonly checkoutService: CheckoutService,
  ) {}

  private ensureAdminRole(user: User) {
    if (!user.role.includes(UserRoleEnum.ADMIN)) {
      throw new UnauthorizedException('Admin access required');
    }
  }

  async createUser(dto: CreateUserDto, admin: User): Promise<User> {
    this.ensureAdminRole(admin);
    const { customer } = await this.userService.createUser(dto);
    return customer;
  }

  async getUserById(id: string, admin: User): Promise<User> {
    this.ensureAdminRole(admin);
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID');
    }
    const user = await this.userService.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateUser(
    id: string,
    updateDto: Partial<CreateUserDto>,
    admin: User,
  ): Promise<User> {
    this.ensureAdminRole(admin);
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID');
    }
    const user = await this.userService.findByIdAndUpdate(id, updateDto); // Changed from update to findByIdAndUpdate
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async createStore(
    dto: CreateStoreDto,
    ownerId: string,
    admin: User,
  ): Promise<Store> {
    this.ensureAdminRole(admin);
    if (!Types.ObjectId.isValid(ownerId)) {
      throw new BadRequestException('Invalid owner ID');
    }
    const { data } = await this.storeService.create(dto, ownerId);
    return data;
  }

  async createStoreBranch(
    dto: CreateStoreDto,
    ownerId: string,
    parentStoreId: string,
    admin: User,
  ): Promise<Store> {
    this.ensureAdminRole(admin);
    if (
      !Types.ObjectId.isValid(ownerId) ||
      !Types.ObjectId.isValid(parentStoreId)
    ) {
      throw new BadRequestException('Invalid owner or parent store ID');
    }
    const { data } = await this.storeService.createBranch(
      dto,
      ownerId,
      parentStoreId,
    );
    return data;
  }

  async getStoresByOwner(ownerId: string, admin: User): Promise<Store[]> {
    this.ensureAdminRole(admin);
    if (!Types.ObjectId.isValid(ownerId)) {
      throw new BadRequestException('Invalid owner ID');
    }
    return this.storeService.findByOwner(ownerId);
  }

  async getStoreById(id: string, admin: User): Promise<Store> {
    this.ensureAdminRole(admin);
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid store ID');
    }
    const store = await this.storeService.findById(id, admin._id.toString());
    if (!store) {
      throw new NotFoundException('Store not found');
    }
    return store;
  }

  async updateStore(
    id: string,
    dto: UpdateStoreDto,
    admin: User,
  ): Promise<Store> {
    this.ensureAdminRole(admin);
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid store ID');
    }
    const store = await this.storeService.update(id, dto, admin._id.toString());
    return store;
  }

  async deleteStore(id: string, admin: User): Promise<void> {
    this.ensureAdminRole(admin);
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid store ID');
    }
    await this.storeService.delete(id, admin._id.toString());
  }

  async createProduct(
    dto: CreateProductDto,
    storeId: string,
    file: Express.Multer.File,
    admin: User,
  ): Promise<ProductDocument> {
    this.ensureAdminRole(admin);
    if (!Types.ObjectId.isValid(storeId)) {
      throw new BadRequestException('Invalid store ID');
    }
    return this.productService.addProduct(
      dto,
      admin._id.toString(),
      storeId,
      [UserRoleEnum.ADMIN],
      undefined,
      file,
    );
  }

  async getProductById(
    id: string,
    storeId: string,
    admin: User,
  ): Promise<ProductDocument> {
    this.ensureAdminRole(admin);
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(storeId)) {
      throw new BadRequestException('Invalid product or store ID');
    }
    const product = await this.productService.findOne(
      id,
      admin._id.toString(),
      storeId,
    );
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async updateProduct(
    id: string,
    storeId: string,
    dto: UpdateProductDto,
    admin: User,
  ): Promise<ProductDocument> {
    this.ensureAdminRole(admin);
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(storeId)) {
      throw new BadRequestException('Invalid product or store ID');
    }
    const product = await this.productService.updateProduct(
      id,
      dto,
      admin._id.toString(),
      storeId,
      [UserRoleEnum.ADMIN],
    );
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async deleteProduct(id: string, storeId: string, admin: User): Promise<void> {
    this.ensureAdminRole(admin);
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(storeId)) {
      throw new BadRequestException('Invalid product or store ID');
    }
    await this.productService.deleteProduct(id, admin._id.toString(), storeId, [
      UserRoleEnum.ADMIN,
    ]);
  }

  async getProductsFiltered(
    storeId: string,
    filter: FilterProductDto & { page?: number; limit?: number },
    admin: User,
  ): Promise<{
    data: ProductDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    this.ensureAdminRole(admin);
    if (!Types.ObjectId.isValid(storeId)) {
      throw new BadRequestException('Invalid store ID');
    }
    return this.productService.getFilteredProducts(
      filter,
      admin._id.toString(),
      storeId,
      filter.page || 1,
      filter.limit || 10,
    );
  }

  async createSubscription(
    userId: string,
    admin: User,
  ): Promise<SubscriptionDocument> {
    this.ensureAdminRole(admin);
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }
    return this.subscriptionService.createSubscription(userId);
  }

  async subscribeToPremium(
    userId: string,
    subscriptionType: 'MONTHLY' | 'YEARLY',
    admin: User,
  ): Promise<SubscriptionDocument> {
    this.ensureAdminRole(admin);
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }
    return this.subscriptionService.subscribeToPremium(
      userId,
      subscriptionType,
    );
  }

  async getSubscriptionStatus(
    userId: string,
    admin: User,
  ): Promise<SubscriptionDocument> {
    this.ensureAdminRole(admin);
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }
    return this.subscriptionService.getSubscriptionStatus(userId);
  }

  async cancelSubscription(
    userId: string,
    admin: User,
  ): Promise<SubscriptionDocument> {
    this.ensureAdminRole(admin);
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }
    return this.subscriptionService.cancelSubscription(userId);
  }

  async getSalesHistory(
    storeId: string,
    productId: string | undefined,
    admin: User,
  ): Promise<Checkout[]> {
    this.ensureAdminRole(admin);
    if (
      !Types.ObjectId.isValid(storeId) ||
      (productId && !Types.ObjectId.isValid(productId))
    ) {
      throw new BadRequestException('Invalid store or product ID');
    }
    return this.checkoutService.getSalesHistory(
      storeId,
      admin._id.toString(),
      [UserRoleEnum.ADMIN],
      productId,
    );
  }

  async getOwingRecords(
    storeId: string,
    supplierId: string | undefined,
    admin: User,
  ): Promise<Checkout[]> {
    this.ensureAdminRole(admin);
    if (
      !Types.ObjectId.isValid(storeId) ||
      (supplierId && !Types.ObjectId.isValid(supplierId))
    ) {
      throw new BadRequestException('Invalid store or supplier ID');
    }
    return this.checkoutService.getOwingRecords(
      storeId,
      admin._id.toString(),
      [UserRoleEnum.ADMIN],
      supplierId,
    );
  }

  async getOwedRecords(
    storeId: string,
    customerId: string | undefined,
    admin: User,
  ): Promise<Checkout[]> {
    this.ensureAdminRole(admin);
    if (
      !Types.ObjectId.isValid(storeId) ||
      (customerId && !Types.ObjectId.isValid(customerId))
    ) {
      throw new BadRequestException('Invalid store or customer ID');
    }
    return this.checkoutService.getOwedRecords(
      storeId,
      admin._id.toString(),
      [UserRoleEnum.ADMIN],
      customerId,
    );
  }

  async updateOrderStatus(
    orderId: string,
    status: 'Processing' | 'Completed',
    admin: User,
  ): Promise<Checkout> {
    this.ensureAdminRole(admin);
    if (!Types.ObjectId.isValid(orderId)) {
      throw new BadRequestException('Invalid order ID');
    }
    return this.checkoutService.updateOrderStatus(
      orderId,
      status,
      admin._id.toString(),
      [UserRoleEnum.ADMIN],
    );
  }
}
