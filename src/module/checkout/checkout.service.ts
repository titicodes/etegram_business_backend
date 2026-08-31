import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { Product, ProductDocument } from '../product/schema/product.schema';
import { UserDocument } from '../user/schema/user.schema';
import { Checkout, CheckoutDocument } from './schema/checkout.schema';
import { NotificationService } from '../notification/notification.service';
import { InvoiceService } from '../invoice/invoice.service';
import { EmailService } from '../email/email.service';
import { UserService } from '../user/user.service';
import { UserRoleEnum } from 'src/common/enums/user.enum';
import { FirebaseService } from 'src/firebase/firebase.service';

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Checkout.name)
    private readonly checkoutModel: Model<CheckoutDocument>,
    private readonly notificationService: NotificationService,
    private readonly invoiceService: InvoiceService,
    private readonly emailService: EmailService,
    private readonly firebaseService: FirebaseService,
    private readonly userService: UserService,
  ) {}

  async createCheckout(
    createCheckoutDto: CreateCheckoutDto,
    user: UserDocument,
  ): Promise<{ checkout: CheckoutDocument; emailWarning?: string }> {
    const {
      cart,
      discount = 0,
      tax = 0,
      paymentMethod,
      storeId,
      isCredit = false,
      customerId,
      supplierId,
      deliveryAddress,
    } = createCheckoutDto;

    this.logger.log(
      `Creating checkout: User=${user._id}, Store=${storeId}, Cart=${JSON.stringify(cart)}, Discount=${discount}, Tax=${tax}, PaymentMethod=${paymentMethod}, IsCredit=${isCredit}, CustomerId=${customerId}, SupplierId=${supplierId}`,
    );

    if (!cart || cart.length === 0) {
      this.logger.error('Empty cart provided');
      throw new BadRequestException('Cart cannot be empty');
    }
    if (!storeId || !Types.ObjectId.isValid(storeId)) {
      this.logger.error(`Invalid or missing store ID: ${storeId}`);
      throw new BadRequestException('Store ID is required and must be valid');
    }
    if (isCredit && !customerId) {
      this.logger.error('Customer ID required for credit sales');
      throw new BadRequestException('Customer ID is required for credit sales');
    }

    let appliedDiscount = 0;
    if (
      discount > 0 &&
      (user.role.includes(UserRoleEnum.STORE_OWNER) ||
        user.role.includes(UserRoleEnum.ADMIN))
    ) {
      appliedDiscount = discount;
      this.logger.log(`Applying discount of ${discount}% by user ${user._id}`);
    } else if (discount > 0) {
      this.logger.warn(
        `User ${user._id} attempted to apply discount without permission`,
      );
      throw new UnauthorizedException(
        'Only store owners or admins can apply discounts',
      );
    }

    const store = await this.validateStoreAccess(
      storeId,
      user._id.toString(),
      user.role,
    );
    if (!store) {
      this.logger.error(
        `Store not found or unauthorized: Store=${storeId}, User=${user._id}`,
      );
      throw new BadRequestException(
        'Store not found or you do not have permission',
      );
    }

    const cartItems = await this.validateAndFetchProducts(
      cart,
      user._id.toString(),
      storeId,
    );
    const totalPrice = cartItems.reduce((acc, item) => acc + item.subtotal, 0);
    const discountedPrice = totalPrice - (totalPrice * appliedDiscount) / 100;
    const totalPriceWithTax = discountedPrice + (discountedPrice * tax) / 100;

    let customerName = `${user.firstName} ${user.lastName}`;
    if (customerId) {
      const customer = await this.userService.findById(customerId);
      if (customer) {
        customerName = `${customer.firstName} ${customer.lastName}`;
      }
    }

    const session = await this.checkoutModel.db.startSession();

    try {
      const result = await session.withTransaction(async () => {
        this.logger.log('Starting checkout transaction...');

        for (const { code, quantity } of cartItems) {
          const product = await this.updateProductStockWithRetry(
            this.productModel,
            code,
            quantity,
            session,
            user._id.toString(),
            storeId,
          );
          if (!product) {
            this.logger.error(`Failed to update stock for product ${code}`);
            throw new BadRequestException(
              `Insufficient quantity for product with code: ${code}`,
            );
          }
        }

        const [checkout] = await this.checkoutModel.create(
          [
            {
              cartItems,
              totalPrice,
              discountedPrice,
              totalPriceWithTax,
              user: user._id,
              status: isCredit ? 'Pending' : 'Completed',
              paymentMethod,
              store: new Types.ObjectId(storeId),
              isCredit,
              customerId: customerId
                ? new Types.ObjectId(customerId)
                : undefined,
              supplierId: supplierId
                ? new Types.ObjectId(supplierId)
                : undefined,
              customerName,
              deliveryAddress: deliveryAddress || 'Not provided',
              createdAt: new Date(),
            },
          ],
          { session },
        );

        this.logger.log(
          `Checkout created successfully: Checkout=${checkout._id}`,
        );
        return { checkout };
      });

      const { checkout } = result;

      for (const { code } of cartItems) {
        const product = await this.productModel
          .findOne({ code, store: new Types.ObjectId(storeId) })
          .exec();
        if (product) {
          await this.firebaseService.updateProductStock(product);
        }
      }

      const orderData = {
        orderId: checkout._id.toString(),
        customerName:
          checkout.customerName || `${user.firstName} ${user.lastName}`,
        totalPrice: checkout.totalPriceWithTax,
        paymentMethod: checkout.paymentMethod,
        deliveryAddress: checkout.deliveryAddress || 'Not provided',
        items: checkout.cartItems.map((item) => ({
          name: item.product.name,
          quantity: item.quantity,
          price: item.subtotal / item.quantity,
        })),
        invoiceUrl: `${process.env.INVOICE_BASE_URL}/invoices/Invoice_${checkout._id}.pdf`,
        currentYear: new Date().getFullYear().toString(),
      };

      let emailWarning: string | undefined;
      try {
        const invoicePath =
          await this.invoiceService.generateInvoice(orderData);
        await this.emailService.sendInvoice(user.email, invoicePath, orderData);
      } catch (error) {
        emailWarning =
          'Invoice email could not be sent due to a server issue. Please check your email later.';
        this.logger.error(
          `Failed to send invoice email: ${error.message}`,
          error.stack,
        );
      }

      await this.firebaseService.trackOrderStatus(
        checkout._id.toString(),
        isCredit ? 'Pending' : 'Completed',
      );

      if (user.fcmToken) {
        await this.firebaseService.sendNotification(
          user.fcmToken,
          isCredit ? 'Credit Sale Recorded' : 'Order Confirmed',
          `Your ${isCredit ? 'credit' : 'order'} has been ${isCredit ? 'recorded' : 'placed'} successfully! Total: ₦${totalPriceWithTax.toFixed(2)}`,
          { orderId: checkout._id.toString() },
        );
      }

      await this.notificationService.sendOrderNotification(
        user._id.toString(),
        checkout,
      );
      this.logger.log(
        `Checkout process completed successfully: Checkout=${checkout._id}`,
      );
      return { checkout, emailWarning };
    } catch (error) {
      this.logger.error(`Checkout failed: ${error.message}`, error.stack);
      throw new BadRequestException(`Checkout failed: ${error.message}`);
    } finally {
      session.endSession();
    }
  }

  async checkProduct(
    code: string,
    storeId: string,
    userId: string,
    userRole: UserRoleEnum[],
  ): Promise<ProductDocument> {
    this.logger.log(
      `Checking product: Code=${code}, Store=${storeId}, User=${userId}, Role=${userRole}`,
    );

    if (!code || !storeId) {
      this.logger.error(
        `Missing required fields: Code=${code}, Store=${storeId}`,
      );
      throw new BadRequestException('Code and storeId are required');
    }
    if (!Types.ObjectId.isValid(storeId)) {
      this.logger.error(`Invalid store ID: ${storeId}`);
      throw new BadRequestException('Invalid store ID');
    }

    const store = await this.validateStoreAccess(storeId, userId, userRole);
    if (!store) {
      this.logger.error(
        `Store not found or unauthorized: Store=${storeId}, User=${userId}`,
      );
      throw new BadRequestException(
        'Store not found or you do not have permission',
      );
    }

    const product = await this.productModel
      .findOne({ code, store: { $in: [storeId, new Types.ObjectId(storeId)] } })
      .exec();

    if (!product) {
      this.logger.error(
        `Product not found: Code=${code}, Store=${storeId}, User=${userId}`,
      );
      throw new NotFoundException(
        `Product with barcode ${code} not found in store ${storeId}`,
      );
    }

    if (product.quantity < 1) {
      this.logger.error(
        `Product out of stock: Code=${code}, Product=${product.name}`,
      );
      throw new BadRequestException(`Product ${product.name} is out of stock`);
    }

    this.logger.log(
      `Product checked successfully: Code=${code}, Product=${product.name}`,
    );
    return product;
  }

  async scanProduct(
    code: string,
    cart: { code: string; quantity: number }[],
    userId: string,
    storeId: string,
    userRole: UserRoleEnum[],
  ): Promise<{
    product: ProductDocument;
    cart: { code: string; quantity: number }[];
  }> {
    this.logger.log(
      `Scanning product: Code=${code}, User=${userId}, Store=${storeId}, Role=${userRole}, Cart=${JSON.stringify(cart)}`,
    );

    if (!code || !cart || !storeId) {
      this.logger.error(
        `Missing required fields: Code=${code}, Store=${storeId}`,
      );
      throw new BadRequestException('Code, cart, and storeId are required');
    }
    if (!Types.ObjectId.isValid(storeId)) {
      this.logger.error(`Invalid store ID: ${storeId}`);
      throw new BadRequestException('Invalid store ID');
    }

    const store = await this.validateStoreAccess(storeId, userId, userRole);
    if (!store) {
      this.logger.error(
        `Store not found or unauthorized: Store=${storeId}, User=${userId}`,
      );
      throw new BadRequestException(
        'Store not found or you do not have permission',
      );
    }

    const product = await this.productModel
      .findOne({ code, store: { $in: [storeId, new Types.ObjectId(storeId)] } })
      .exec();

    if (!product) {
      this.logger.error(
        `Product not found: Code=${code}, Store=${storeId}, User=${userId}`,
      );
      throw new NotFoundException(
        `Product with barcode ${code} not found in store ${storeId}`,
      );
    }

    if (product.quantity < 1) {
      this.logger.error(
        `Product out of stock: Code=${code}, Product=${product.name}`,
      );
      throw new BadRequestException(`Product ${product.name} is out of stock`);
    }

    const existingCartItem = cart.find((item) => item.code === code);
    if (existingCartItem) {
      if (existingCartItem.quantity + 1 > product.quantity) {
        throw new BadRequestException(
          `Insufficient stock for ${product.name}. Available: ${product.quantity}`,
        );
      }
      existingCartItem.quantity++;
    } else {
      cart.push({ code, quantity: 1 });
    }

    await this.firebaseService.updateProductStock(product);
    this.logger.log(
      `Product scanned successfully: Code=${code}, Cart=${JSON.stringify(cart)}`,
    );
    return {
      product,
      cart,
    };
  }

  async getSalesHistory(
    storeId: string,
    userId: string,
    userRole: UserRoleEnum[],
    productId?: string,
  ): Promise<CheckoutDocument[]> {
    this.logger.log(
      `Fetching sales history: Store=${storeId}, User=${userId}, Role=${userRole}, ProductId=${productId || 'all'}`,
    );

    if (!Types.ObjectId.isValid(storeId)) {
      this.logger.error(`Invalid store ID: ${storeId}`);
      throw new BadRequestException('Invalid store ID');
    }

    const store = await this.validateStoreAccess(storeId, userId, userRole);
    if (!store) {
      this.logger.error(
        `Store not found or unauthorized: Store=${storeId}, User=${userId}`,
      );
      throw new BadRequestException(
        'Store not found or you do not have permission',
      );
    }

    const query: any = { store: new Types.ObjectId(storeId) };
    if (productId && Types.ObjectId.isValid(productId)) {
      query['cartItems.product._id'] = new Types.ObjectId(productId);
    }

    const sales = await this.checkoutModel
      .find(query)
      .sort({ createdAt: -1 })
      .exec();
    this.logger.log(
      `Fetched ${sales.length} sales records for store ${storeId}`,
    );
    return sales;
  }

  async getOwingRecords(
    storeId: string,
    userId: string,
    userRole: UserRoleEnum[],
    supplierId?: string,
  ): Promise<CheckoutDocument[]> {
    this.logger.log(
      `Fetching owing records: Store=${storeId}, User=${userId}, Role=${userRole}, SupplierId=${supplierId || 'all'}`,
    );

    if (!Types.ObjectId.isValid(storeId)) {
      this.logger.error(`Invalid store ID: ${storeId}`);
      throw new BadRequestException('Invalid store ID');
    }

    const store = await this.validateStoreAccess(storeId, userId, userRole);
    if (!store) {
      this.logger.error(
        `Store not found or unauthorized: Store=${storeId}, User=${userId}`,
      );
      throw new BadRequestException(
        'Store not found or you do not have permission',
      );
    }

    const query: any = {
      store: new Types.ObjectId(storeId),
      supplierId: { $exists: true },
    };
    if (supplierId && Types.ObjectId.isValid(supplierId)) {
      query.supplierId = new Types.ObjectId(supplierId);
    }

    const owing = await this.checkoutModel
      .find(query)
      .sort({ createdAt: -1 })
      .exec();
    this.logger.log(
      `Fetched ${owing.length} owing records for store ${storeId}`,
    );
    return owing;
  }

  async getOwedRecords(
    storeId: string,
    userId: string,
    userRole: UserRoleEnum[],
    customerId?: string,
  ): Promise<CheckoutDocument[]> {
    this.logger.log(
      `Fetching owed records: Store=${storeId}, User=${userId}, Role=${userRole}, CustomerId=${customerId || 'all'}`,
    );

    if (!Types.ObjectId.isValid(storeId)) {
      this.logger.error(`Invalid store ID: ${storeId}`);
      throw new BadRequestException('Invalid store ID');
    }

    const store = await this.validateStoreAccess(storeId, userId, userRole);
    if (!store) {
      this.logger.error(
        `Store not found or unauthorized: Store=${storeId}, User=${userId}`,
      );
      throw new BadRequestException(
        'Store not found or you do not have permission',
      );
    }

    const query: any = { store: new Types.ObjectId(storeId), isCredit: true };
    if (customerId && Types.ObjectId.isValid(customerId)) {
      query.customerId = new Types.ObjectId(customerId);
    }

    const owed = await this.checkoutModel
      .find(query)
      .sort({ createdAt: -1 })
      .exec();
    this.logger.log(`Fetched ${owed.length} owed records for store ${storeId}`);
    return owed;
  }

  async updateOrderStatus(
    orderId: string,
    status: 'Processing' | 'Completed',
    userId: string,
    userRole: UserRoleEnum[],
  ): Promise<CheckoutDocument> {
    this.logger.log(
      `Updating order status: Order=${orderId}, Status=${status}, User=${userId}, Role=${userRole}`,
    );

    if (!Types.ObjectId.isValid(orderId)) {
      this.logger.error(`Invalid order ID: ${orderId}`);
      throw new BadRequestException('Invalid order ID');
    }

    if (
      !userRole.includes(UserRoleEnum.STORE_OWNER) &&
      !userRole.includes(UserRoleEnum.ADMIN)
    ) {
      this.logger.error(
        `Unauthorized order status update: User=${userId}, Role=${userRole}`,
      );
      throw new UnauthorizedException(
        'Only store owners or admins can update order status',
      );
    }

    const order = await this.checkoutModel.findById(orderId).exec();
    if (!order) {
      this.logger.error(`Order not found: Order=${orderId}`);
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    const store = await this.validateStoreAccess(
      order.store.toString(),
      userId,
      userRole,
    );
    if (!store) {
      this.logger.error(
        `Store not found or unauthorized: Store=${order.store}, User=${userId}`,
      );
      throw new BadRequestException(
        'Store not found or you do not have permission',
      );
    }

    order.status = status;
    await order.save();

    await this.firebaseService.trackOrderStatus(orderId, status);
    await this.notificationService.sendOrderStatusUpdate(
      orderId,
      userId,
      status,
    );
    this.logger.log(`Order status updated: Order=${orderId}, Status=${status}`);
    return order;
  }

  private async validateAndFetchProducts(
    products: { code: string; quantity: number }[],
    userId: string,
    storeId: string,
  ): Promise<
    {
      code: string;
      quantity: number;
      subtotal: number;
      product: ProductDocument;
    }[]
  > {
    this.logger.log(
      `Validating products: User=${userId}, Store=${storeId}, Products=${JSON.stringify(products)}`,
    );

    return await Promise.all(
      products.map(async ({ code, quantity }) => {
        const product = await this.productModel
          .findOne({
            code,
            store: { $in: [storeId, new Types.ObjectId(storeId)] },
          })
          .exec();

        if (!product) {
          this.logger.error(
            `Product not found: Code=${code}, Store=${storeId}, User=${userId}`,
          );
          throw new NotFoundException(
            `Product with code ${code} not found in store ${storeId}`,
          );
        }

        if (product.quantity < quantity) {
          this.logger.error(
            `Insufficient quantity: Code=${code}, Available=${product.quantity}, Requested=${quantity}`,
          );
          throw new BadRequestException(
            `Insufficient quantity for product with code: ${code}`,
          );
        }

        return {
          code,
          quantity,
          subtotal: product.price * quantity,
          product: product.toObject(),
        };
      }),
    );
  }

  private async updateProductStockWithRetry(
    productModel: Model<ProductDocument>,
    code: string,
    quantity: number,
    session: ClientSession,
    userId: string,
    storeId: string,
    maxRetries = 3,
  ): Promise<ProductDocument | null> {
    let retries = 0;

    while (retries < maxRetries) {
      try {
        const product = await productModel
          .findOne({
            code,
            store: { $in: [storeId, new Types.ObjectId(storeId)] },
          })
          .session(session)
          .exec();

        if (!product) {
          this.logger.error(
            `Product not found during stock update: Code=${code}, Store=${storeId}, User=${userId}`,
          );
          throw new BadRequestException(
            `Product with code ${code} not found in store ${storeId}`,
          );
        }

        if (product.quantity < quantity) {
          this.logger.error(
            `Insufficient quantity during stock update: Code=${code}, Available=${product.quantity}, Requested=${quantity}`,
          );
          throw new BadRequestException(
            `Insufficient quantity for product with code ${code}`,
          );
        }

        product.quantity -= quantity;
        if (product.stock !== undefined) {
          product.stock = product.quantity;
        }
        await product.save({ session });
        this.logger.log(
          `Stock updated: Code=${code}, NewQuantity=${product.quantity}`,
        );
        return product;
      } catch (error) {
        if (
          this.isTransientTransactionError(error) &&
          retries < maxRetries - 1
        ) {
          retries++;
          this.logger.warn(
            `Transient error detected, retrying updateProductStock for ${code} (attempt ${retries + 1})`,
          );
          await new Promise((resolve) =>
            setTimeout(resolve, 100 * (retries + 1)),
          );
        } else {
          throw error;
        }
      }
    }

    return null;
  }

  private async validateStoreAccess(
    storeId: string,
    userId: string,
    userRole: UserRoleEnum[],
  ): Promise<any> {
    const storeModel = this.productModel.db.model('Store');
    let store;

    if (userRole.includes(UserRoleEnum.ADMIN)) {
      store = await storeModel.findById(storeId).exec();
    } else {
      store = await storeModel.findOne({ _id: storeId, owner: userId }).exec();
    }

    this.logger.debug(
      `Store access check: Store=${storeId}, User=${userId}, Role=${userRole}, Found=${!!store}`,
    );
    return store;
  }

  private isTransientTransactionError(error: any): boolean {
    const transientErrorCodes = [
      'NoSuchTransaction',
      'WriteConflict',
      'LockTimeout',
      'UnknownTransactionCommitResult',
    ];
    return (
      error?.hasErrorLabel?.('TransientTransactionError') ||
      transientErrorCodes.includes(error.codeName) ||
      error.code === 251
    );
  }
}
