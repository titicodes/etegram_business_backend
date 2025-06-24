import { BadRequestException, Injectable, NotFoundException, InternalServerErrorException, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { Product, ProductDocument } from '../product/schema/product.schema';
import { User, UserDocument } from '../user/schema/user.schema';
import { Checkout, CheckoutDocument } from './schema/checkout.schema';
import { NotificationService } from '../notification/notification.service';
import { InvoiceService } from '../invoice/invoice.service';
import { EmailService } from '../email/email.service';
import { UserService } from '../user/user.service';
import { FirebaseService } from 'src/firebase/firebase.service';
import { UserRoleEnum } from 'src/common/enums/user.enum';

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(Checkout.name) private readonly checkoutModel: Model<CheckoutDocument>,
    private readonly notificationService: NotificationService,
    private readonly invoiceService: InvoiceService,
    private readonly emailService: EmailService,
    private readonly firebaseService: FirebaseService,
    private readonly userService: UserService,
  ) { }

  async scanProduct(
    code: string,
    cart: { code: string; quantity: number }[],
    userId: string,
    storeId: string,
    userRole: UserRoleEnum[],
  ): Promise<{ product: ProductDocument; cart: { code: string; quantity: number }[] }> {
    this.logger.log(`Scanning product: Code=${code}, User=${userId}, Store=${storeId}, Role=${userRole}, Cart=${JSON.stringify(cart)}`);

    // Validate inputs
    if (!code || !cart || !storeId) {
      this.logger.error(`Missing required fields: Code=${code}, Store=${storeId}`);
      throw new BadRequestException('Code, cart, and storeId are required');
    }
    if (!Types.ObjectId.isValid(storeId)) {
      this.logger.error(`Invalid store ID: ${storeId}`);
      throw new BadRequestException('Invalid store ID');
    }

    // Validate store access
    const store = await this.validateStoreAccess(storeId, userId, userRole);
    if (!store) {
      this.logger.error(`Store not found or unauthorized: Store=${storeId}, User=${userId}`);
      throw new BadRequestException('Store not found or you do not have permission');
    }

    // Debug: Check all products with the code
    const debugProducts = await this.productModel.find({ code }).exec();
    this.logger.debug(`All products with code ${code}: ${JSON.stringify(debugProducts.map(p => ({ code: p.code, store: p.store.toString(), createdBy: p.createdBy?.toString(), quantity: p.quantity, stock: p.stock })))}`);

    // Find product (try both ObjectId and string for store)
    let product = await this.productModel
      .findOne({ code, store: { $in: [storeId, new Types.ObjectId(storeId)] } })
      .exec();

    if (!product) {
      // Debug: Try finding product without store constraint
      product = await this.productModel.findOne({ code }).exec();
      if (product) {
        this.logger.warn(`Product found but store mismatch: Code=${code}, ProductStore=${product.store.toString()}, RequestedStore=${storeId}`);
        throw new NotFoundException(`Product with barcode ${code} not in store ${storeId}. It belongs to store ${product.store.toString()}`);
      }
      this.logger.error(`Product not found: Code=${code}, Store=${storeId}, User=${userId}`);
      throw new NotFoundException(`Product with barcode ${code} not found in any store`);
    }

    // Check stock consistency
    if (product.stock !== undefined && product.stock !== product.quantity) {
      this.logger.warn(`Stock mismatch for product ${code}: quantity=${product.quantity}, stock=${product.stock}`);
      product.stock = product.quantity;
      await product.save();
    }

    if (product.quantity < 1) {
      this.logger.error(`Product out of stock: Code=${code}, Product=${product.name}`);
      throw new BadRequestException(`Product ${product.name} is out of stock`);
    }

    // Update cart
    const existingCartItem = cart.find((item) => item.code === code);
    if (existingCartItem) {
      existingCartItem.quantity++;
    } else {
      cart.push({ code, quantity: 1 });
    }

    // Update Firebase stock
    await this.firebaseService.updateProductStock(product);

    this.logger.log(`Product scanned successfully: Code=${code}, Cart=${JSON.stringify(cart)}`);
    return { product, cart };
  }

  // async createCheckout(createCheckoutDto: CreateCheckoutDto, user: UserDocument): Promise<CheckoutDocument> {
  //   const { cart, discount = 0, tax = 0, paymentMethod, storeId } = createCheckoutDto;

  //   this.logger.log(`Creating checkout: User=${user._id}, Store=${storeId}, Cart=${JSON.stringify(cart)}`);

  //   // Validate input
  //   if (!cart || cart.length === 0) {
  //     this.logger.error('Empty cart provided');
  //     throw new BadRequestException('Cart cannot be empty');
  //   }
  //   if (!storeId || !Types.ObjectId.isValid(storeId)) {
  //     this.logger.error(`Invalid or missing store ID: ${storeId}`);
  //     throw new BadRequestException('Store ID is required and must be valid');
  //   }

  //   // Validate store access
  //   const store = await this.validateStoreAccess(storeId, user._id.toString(), user.role);
  //   if (!store) {
  //     this.logger.error(`Store not found or unauthorized: Store=${storeId}, User=${user._id}`);
  //     throw new BadRequestException('Store not found or you do not have permission');
  //   }

  //   // Validate and fetch products
  //   const cartItems = await this.validateAndFetchProducts(cart, user._id.toString(), storeId);
  //   const totalPrice = cartItems.reduce((acc, item) => acc + item.subtotal, 0);
  //   const discountedPrice = totalPrice - (totalPrice * discount) / 100;
  //   const totalPriceWithTax = discountedPrice + (discountedPrice * tax) / 100;

  //   const session = await this.checkoutModel.db.startSession();

  //   try {
  //     const result = await session.withTransaction(async () => {
  //       this.logger.log('Starting checkout transaction...');

  //       // Update product quantities
  //       for (const { code, quantity } of cartItems) {
  //         this.logger.log(`Updating quantity for product ${code}, quantity: ${quantity}`);
  //         const product = await this.updateProductStockWithRetry(
  //           this.productModel,
  //           code,
  //           quantity,
  //           session,
  //           user._id.toString(),
  //           storeId,
  //         );
  //         if (!product) {
  //           throw new BadRequestException(`Insufficient quantity for product with code: ${code}`);
  //         }
  //       }

  //       // Create checkout
  //       const [checkout] = await this.checkoutModel.create(
  //         [
  //           {
  //             cartItems,
  //             totalPrice,
  //             discountedPrice,
  //             totalPriceWithTax,
  //             user: user._id,
  //             status: 'Completed',
  //             createdAt: new Date(),
  //             paymentMethod,
  //             store: new Types.ObjectId(storeId),
  //           },
  //         ],
  //         { session },
  //       );

  //       this.logger.log(`Checkout created successfully: Checkout=${checkout._id}`);
  //       return { checkout };
  //     });

  //     const { checkout } = result;

  //     // Update Firebase stock for all products
  //     for (const { code } of cartItems) {
  //       const product = await this.productModel.findOne({ code, store: { $in: [storeId, new Types.ObjectId(storeId)] } }).exec();
  //       if (product) {
  //         if (product.stock !== undefined && product.stock !== product.quantity) {
  //           this.logger.warn(`Stock mismatch for product ${code}: quantity=${product.quantity}, stock=${product.stock}`);
  //           product.stock = product.quantity;
  //           await product.save();
  //         }
  //         await this.firebaseService.updateProductStock(product);
  //       }
  //     }

  //     // Generate and send invoice
  //     const invoice = await this.invoiceService.generateInvoice({
  //       ...checkout.toObject(),
  //       orderId: checkout._id.toString(),
  //       items: checkout.cartItems,
  //     });

  //     if (!user.email) {
  //       this.logger.error(`User email missing: User=${user._id}`);
  //       throw new BadRequestException('User email is required to send an invoice');
  //     }

  //     await this.emailService.sendInvoice(user.email, invoice);
  //     await this.firebaseService.trackOrderStatus(checkout._id.toString(), 'Completed');

  //     // Send push notification
  //     const userWithToken = await this.userService.findById(user._id.toString());
  //     if (userWithToken?.fcmToken) {
  //       await this.firebaseService.sendPushNotification(
  //         userWithToken.fcmToken,
  //         'Order Confirmed',
  //         `Your order has been placed successfully! Total: ₦${totalPriceWithTax}`,
  //       );
  //     }

  //     // Send order notification
  //     await this.notificationService.sendOrderNotification(user, checkout);

  //     this.logger.log(`Checkout process completed successfully: Checkout=${checkout._id}`);
  //     return checkout;
  //   } catch (error) {
  //     this.logger.error(`Checkout failed: ${error.message}`, error.stack);
  //     throw new InternalServerErrorException('Checkout failed. Please try again');
  //   } finally {
  //     session.endSession();
  //   }
  // }

  async createCheckout(createCheckoutDto: CreateCheckoutDto, user: UserDocument): Promise<CheckoutDocument> {
    const { cart, discount = 0, tax = 0, paymentMethod, storeId } = createCheckoutDto;

    this.logger.log(`Creating checkout: User=${user._id}, Store=${storeId}, Cart=${JSON.stringify(cart)}, Discount=${discount}, Tax=${tax}, PaymentMethod=${paymentMethod}`);

    // Validate input
    if (!cart || cart.length === 0) {
      this.logger.error('Empty cart provided');
      throw new BadRequestException('Cart cannot be empty');
    }
    if (!storeId || !Types.ObjectId.isValid(storeId)) {
      this.logger.error(`Invalid or missing store ID: ${storeId}`);
      throw new BadRequestException('Store ID is required and must be valid');
    }

    // Validate store access
    const store = await this.validateStoreAccess(storeId, user._id.toString(), user.role);
    if (!store) {
      this.logger.error(`Store not found or unauthorized: Store=${storeId}, User=${user._id}`);
      throw new BadRequestException('Store not found or you do not have permission');
    }

    // Validate and fetch products
    this.logger.log(`Validating cart items: ${JSON.stringify(cart)}`);
    const cartItems = await this.validateAndFetchProducts(cart, user._id.toString(), storeId);
    this.logger.log(`Validated cart items: ${JSON.stringify(cartItems.map(item => ({ code: item.code, quantity: item.quantity, subtotal: item.subtotal })))}`);

    const totalPrice = cartItems.reduce((acc, item) => acc + item.subtotal, 0);
    const discountedPrice = totalPrice - (totalPrice * discount) / 100;
    const totalPriceWithTax = discountedPrice + (discountedPrice * tax) / 100;

    const session = await this.checkoutModel.db.startSession();

    try {
      const result = await session.withTransaction(async () => {
        this.logger.log('Starting checkout transaction...');

        // Update product quantities
        for (const { code, quantity } of cartItems) {
          this.logger.log(`Updating quantity for product ${code}, quantity: ${quantity}`);
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
            throw new BadRequestException(`Insufficient quantity for product with code: ${code}`);
          }
        }

        // Create checkout
        const [checkout] = await this.checkoutModel.create(
          [
            {
              cartItems,
              totalPrice,
              discountedPrice,
              totalPriceWithTax,
              user: user._id,
              status: 'Completed',
              createdAt: new Date(),
              paymentMethod,
              store: new Types.ObjectId(storeId),
            },
          ],
          { session },
        );

        this.logger.log(`Checkout created successfully: Checkout=${checkout._id}`);
        return { checkout };
      });

      const { checkout } = result;

      // Update Firebase stock for all products
      for (const { code } of cartItems) {
        const product = await this.productModel.findOne({ code, store: { $in: [storeId, new Types.ObjectId(storeId)] } }).exec();
        if (product) {
          if (product.stock !== undefined && product.stock !== product.quantity) {
            this.logger.warn(`Stock mismatch for product ${code}: quantity=${product.quantity}, stock=${product.stock}`);
            product.stock = product.quantity;
            await product.save();
          }
          await this.firebaseService.updateProductStock(product);
        }
      }

      // Generate and send invoice
      const invoice = await this.invoiceService.generateInvoice({
        ...checkout.toObject(),
        orderId: checkout._id.toString(),
        items: checkout.cartItems,
      });

      if (!user.email) {
        this.logger.error(`User email missing: User=${user._id}`);
        throw new BadRequestException('User email is required to send an invoice');
      }

      await this.emailService.sendInvoice(user.email, invoice);
      await this.firebaseService.trackOrderStatus(checkout._id.toString(), 'Completed');

      // Send push notification
      const userWithToken = await this.userService.findById(user._id.toString());
      if (userWithToken?.fcmToken) {
        await this.firebaseService.sendPushNotification(
          userWithToken.fcmToken,
          'Order Confirmed',
          `Your order has been placed successfully! Total: ₦${totalPriceWithTax}`,
        );
      }

      // Send order notification
      await this.notificationService.sendOrderNotification(user, checkout);

      this.logger.log(`Checkout process completed successfully: Checkout=${checkout._id}`);
      return checkout;
    } catch (error) {
      this.logger.error(`Checkout failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Checkout failed: ${error.message}`);
    } finally {
      session.endSession();
    }
  }

  async updateOrderStatus(orderId: string, status: 'Processing' | 'Completed', userId: string, userRole: UserRoleEnum[]): Promise<CheckoutDocument> {
    this.logger.log(`Updating order status: Order=${orderId}, Status=${status}, User=${userId}, Role=${userRole}`);

    // Validate orderId
    if (!Types.ObjectId.isValid(orderId)) {
      this.logger.error(`Invalid order ID: ${orderId}`);
      throw new BadRequestException('Invalid order ID');
    }

    // Restrict status updates to STORE_OWNER or ADMIN
    if (!userRole.includes(UserRoleEnum.STORE_OWNER) && !userRole.includes(UserRoleEnum.ADMIN)) {
      this.logger.error(`Unauthorized order status update: User=${userId}, Role=${userRole}`);
      throw new UnauthorizedException('Only store owners or admins can update order status');
    }

    const order = await this.checkoutModel.findById(orderId).exec();
    if (!order) {
      this.logger.error(`Order not found: Order=${orderId}`);
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    // Validate store access
    const store = await this.validateStoreAccess(order.store.toString(), userId, userRole);
    if (!store) {
      this.logger.error(`Store not found or unauthorized: Store=${order.store}, User=${userId}`);
      throw new BadRequestException('Store not found or you do not have permission');
    }

    order.status = status;
    await order.save();

    await this.firebaseService.trackOrderStatus(orderId, status);
    this.logger.log(`Order status updated: Order=${orderId}, Status=${status}`);
    return order;
  }

  private async validateAndFetchProducts(
    products: { code: string; quantity: number }[],
    userId: string,
    storeId: string,
  ): Promise<{ code: string; quantity: number; subtotal: number; product: ProductDocument }[]> {
    this.logger.log(`Validating products: User=${userId}, Store=${storeId}, Products=${JSON.stringify(products)}`);

    return await Promise.all(
      products.map(async ({ code, quantity }) => {
        // Debug: Check all products with the code
        const debugProducts = await this.productModel.find({ code }).exec();
        this.logger.debug(`All products with code ${code}: ${JSON.stringify(debugProducts.map(p => ({ code: p.code, store: p.store.toString(), createdBy: p.createdBy?.toString(), quantity: p.quantity, stock: p.stock })))}`);

        let product = await this.productModel
          .findOne({ code, store: { $in: [storeId, new Types.ObjectId(storeId)] } })
          .exec();

        if (!product) {
          // Debug: Try finding product without store constraint
          product = await this.productModel.findOne({ code }).exec();
          if (product) {
            this.logger.warn(`Product found but store mismatch: Code=${code}, ProductStore=${product.store.toString()}, RequestedStore=${storeId}`);
            throw new NotFoundException(`Product with barcode ${code} not in store ${storeId}. It belongs to store ${product.store.toString()}`);
          }
          this.logger.error(`Product not found: Code=${code}, Store=${storeId}, User=${userId}`);
          throw new NotFoundException(`Product with code ${code} not found in any store`);
        }

        // Check stock consistency
        if (product.stock !== undefined && product.stock !== product.quantity) {
          this.logger.warn(`Stock mismatch for product ${code}: quantity=${product.quantity}, stock=${product.stock}`);
          product.stock = product.quantity;
          await product.save();
        }

        if (product.quantity < quantity) {
          this.logger.error(`Insufficient quantity: Code=${code}, Available=${product.quantity}, Requested=${quantity}`);
          throw new BadRequestException(`Insufficient quantity for product with code: ${code}`);
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
        let product = await productModel
          .findOne({ code, store: { $in: [storeId, new Types.ObjectId(storeId)] } })
          .session(session)
          .exec();

        if (!product) {
          // Debug: Try finding product without store constraint
          product = await this.productModel.findOne({ code }).session(session).exec();
          if (product) {
            this.logger.warn(`Product found but store mismatch: Code=${code}, ProductStore=${product.store.toString()}, RequestedStore=${storeId}`);
            throw new BadRequestException(`Product with barcode ${code} not in store ${storeId}. It belongs to store ${product.store.toString()}`);
          }
          this.logger.error(`Product not found during stock update: Code=${code}, Store=${storeId}, User=${userId}`);
          throw new BadRequestException(`Product with code ${code} not found in any store`);
        }

        // Check stock consistency
        if (product.stock !== undefined && product.stock !== product.quantity) {
          this.logger.warn(`Stock mismatch for product ${code}: quantity=${product.quantity}, stock=${product.stock}`);
          product.stock = product.quantity;
          await product.save({ session });
        }

        if (product.quantity < quantity) {
          this.logger.error(`Insufficient quantity during stock update: Code=${code}, Available=${product.quantity}, Requested=${quantity}`);
          throw new BadRequestException(`Insufficient quantity for product with code ${code}`);
        }

        product.quantity -= quantity;
        if (product.stock !== undefined) {
          product.stock = product.quantity;
        }
        await product.save({ session });
        this.logger.log(`Stock updated: Code=${code}, NewQuantity=${product.quantity}`);
        return product;
      } catch (error) {
        if (this.isTransientTransactionError(error) && retries < maxRetries - 1) {
          retries++;
          this.logger.warn(`Transient error detected, retrying updateProductStock for ${code} (attempt ${retries + 1})`);
          await new Promise((resolve) => setTimeout(resolve, 100 * (retries + 1)));
        } else {
          throw error;
        }
      }
    }

    return null;
  }

  private async validateStoreAccess(storeId: string, userId: string, userRole: UserRoleEnum[]): Promise<any> {
    const storeModel = this.productModel.db.model('Store');
    let store;

    if (userRole.includes(UserRoleEnum.ADMIN)) {
      store = await storeModel.findById(storeId).exec();
    } else {
      store = await storeModel.findOne({ _id: storeId, owner: userId }).exec();
    }

    this.logger.debug(`Store access check: Store=${storeId}, User=${userId}, Role=${userRole}, Found=${!!store}, StoreDetails=${JSON.stringify(store)}`);
    return store;
  }

  private isTransientTransactionError(error: any): boolean {
    const transientErrorCodes = ['NoSuchTransaction', 'WriteConflict', 'LockTimeout', 'UnknownTransactionCommitResult'];
    return (
      error?.hasErrorLabel?.('TransientTransactionError') ||
      transientErrorCodes.includes(error.codeName) ||
      error.code === 251
    );
  }

  async getProductByCode(code: string): Promise<ProductDocument[]> {
    this.logger.log(`Fetching products with code: ${code}`);
    const products = await this.productModel.find({ code }).exec();
    this.logger.debug(`Found products: ${JSON.stringify(products.map(p => ({ code: p.code, store: p.store.toString(), createdBy: p.createdBy?.toString(), quantity: p.quantity, stock: p.stock })))}`);
    return products;
  }

  async checkProduct(
    code: string,
    storeId: string,
    userId: string,
    userRole: UserRoleEnum[],
  ): Promise<ProductDocument> {
    this.logger.log(`Checking product: Code=${code}, Store=${storeId}, User=${userId}, Role=${userRole}`);

    // Validate inputs
    if (!code || !storeId) {
      this.logger.error(`Missing required fields: Code=${code}, Store=${storeId}`);
      throw new BadRequestException('Code and storeId are required');
    }
    if (!Types.ObjectId.isValid(storeId)) {
      this.logger.error(`Invalid store ID: ${storeId}`);
      throw new BadRequestException('Invalid store ID');
    }

    // Validate store access
    const store = await this.validateStoreAccess(storeId, userId, userRole);
    if (!store) {
      this.logger.error(`Store not found or unauthorized: Store=${storeId}, User=${userId}`);
      throw new BadRequestException('Store not found or you do not have permission');
    }

    // Debug: Check all products with the code
    const debugProducts = await this.productModel.find({ code }).exec();
    this.logger.debug(`All products with code ${code}: ${JSON.stringify(debugProducts.map(p => ({ code: p.code, store: p.store?.toString(), createdBy: p.createdBy?.toString(), quantity: p.quantity, stock: p.stock })))}`);

    // Find product (try both ObjectId and string for store)
    let product = await this.productModel
      .findOne({ code, store: { $in: [storeId, new Types.ObjectId(storeId)] } })
      .exec();

    if (!product) {
      // Debug: Try finding product without store constraint
      product = await this.productModel.findOne({ code }).exec();
      if (product) {
        this.logger.warn(`Product found but store mismatch: Code=${code}, ProductStore=${product.store?.toString()}, RequestedStore=${storeId}`);
        throw new NotFoundException(`Product with barcode ${code} not in store ${storeId}. It belongs to store ${product.store?.toString()}`);
      }
      this.logger.error(`Product not found: Code=${code}, Store=${storeId}, User=${userId}`);
      throw new NotFoundException(`Product with barcode ${code} not found in any store`);
    }

    // Check stock consistency
    if (product.stock !== undefined && product.stock !== product.quantity) {
      this.logger.warn(`Stock mismatch for product ${code}: quantity=${product.quantity}, stock=${product.stock}`);
      product.stock = product.quantity;
      await product.save();
    }

    if (product.quantity < 1) {
      this.logger.error(`Product out of stock: Code=${code}, Product=${product.name}`);
      throw new BadRequestException(`Product ${product.name} is out of stock`);
    }

    this.logger.log(`Product found: Code=${code}, Name=${product.name}, Store=${storeId}, Quantity=${product.quantity}, Stock=${product.stock}`);
    return product;
  }
}