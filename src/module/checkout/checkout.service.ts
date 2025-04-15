import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { Product, ProductDocument } from '../product/schema/product.schema';
import { User } from '../user/schema/user.schema';
import { Checkout, CheckoutDocument } from './schema/checkout.schema';
import { NotificationService } from '../notification/notification.service';
import { InvoiceService } from '../invoice/invoice.service';
import { EmailService } from '../email/email.service';
import { FirebaseService } from 'src/firebase/firebase.service';
import { UserService } from '../user/user.service'; // Import UserService

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
        private readonly userService: UserService, // Inject UserService
    ) { }

    async scanProduct(code: string, cart: { code: string; quantity: number }[]): Promise<{ product: Product; cart: { code: string; quantity: number }[] }> {
      const product = await this.productModel.findOne({ code }).exec();
      if (!product) throw new NotFoundException(`Product with barcode ${code} not found`);
  
      if (product.stock < 1) {
          throw new BadRequestException(`Product ${product.name} is out of stock`);
      }
  
      const existingCartItem = cart.find(item => item.code === code);
      if (existingCartItem) {
          existingCartItem.quantity++;
      } else {
          cart.push({ code, quantity: 1 });
      }
  
      await this.firebaseService.updateProductStock(product);
  
      return { product, cart };
  }
  
    async createCheckout(createCheckoutDto: CreateCheckoutDto, user: User): Promise<Checkout> {
        const { cart, discount = 0, tax = 0, paymentMethod } = createCheckoutDto;

        if (!cart || cart.length === 0) {
            throw new BadRequestException('Cart cannot be empty.');
        }

        const cartItems = await this.validateAndFetchProducts(cart);

        const totalPrice = cartItems.reduce((acc, item) => acc + item.subtotal, 0);
        const discountedPrice = totalPrice - (totalPrice * discount) / 100;
        const totalPriceWithTax = discountedPrice + (discountedPrice * tax) / 100;

        const session = await this.checkoutModel.db.startSession();
        session.startTransaction();

        try {
            this.logger.log('Starting checkout transaction...');

            await Promise.all(
                cartItems.map(async ({ code, quantity }) => {
                    this.logger.log(`Updating stock for product ${code}, quantity: ${quantity}`);
                    const product = await this.updateProductStockWithRetry(this.productModel, code, quantity, session);
                    if (!product) throw new BadRequestException(`Insufficient stock for product with code: ${code}`);

                    await this.firebaseService.updateProductStock(product);
                    this.logger.log(`Stock updated for product ${code}`);
                }),
            );

            this.logger.log('All stock updates successful.');

            const checkout = await this.checkoutModel.create(
                [
                    {
                        cartItems,
                        totalPrice,
                        discountedPrice,
                        totalPriceWithTax,
                        user,
                        status: 'Completed',
                        createdAt: new Date(),
                        paymentMethod: paymentMethod,
                    },
                ],
                { session },
            );

            this.logger.log('Checkout created successfully.');

            const invoice = await this.invoiceService.generateInvoice({
                ...checkout[0].toObject(),
                orderId: checkout[0]._id.toString(),
                items: checkout[0].cartItems,
            });

            this.logger.log('Invoice generated successfully.');

            // 🔍 Validate user email before sending invoice
            if (!user?.email) {
                this.logger.error('❌ No recipient email provided for invoice.');
                throw new BadRequestException('User email is required to send an invoice.');
            }

            await this.emailService.sendInvoice(user.email, invoice);
            this.logger.log('Invoice email sent successfully.');

            await this.firebaseService.trackOrderStatus(checkout[0]._id.toString(), 'Completed');
            this.logger.log('Firebase order status tracked.');

            // Retrieve the user with the FCM token
            const userWithToken = await this.userService.findOne({ _id: user._id });
            console.log('Retrieved User with Token:', userWithToken); // Log the user object
            if (!userWithToken || !userWithToken.fcmToken) {
                this.logger.warn(`⚠️ No FCM token found for user ${user._id}`);
            } else {
                console.log('FCM Token:', userWithToken.fcmToken); // Log the token
                await this.firebaseService.sendPushNotification(
                    userWithToken.fcmToken, // Use the token from the retrieved user
                    'Order Confirmed',
                    `Your order has been placed successfully! Total: ₦${totalPriceWithTax}`,
                );
                this.logger.log('Push notification sent.');
            }

            await this.notificationService.sendOrderNotification(user, checkout[0]);
            this.logger.log('Order notification sent.');

            await session.commitTransaction();
            this.logger.log('Transaction committed successfully.');
            session.endSession();
            return checkout[0];
        } catch (error) {
            this.logger.error('Checkout failed:', error);
            await session.abortTransaction();
            session.endSession();
            throw new InternalServerErrorException('Checkout failed.');
        }
    }

    private async validateAndFetchProducts(products: { code: string; quantity: number }[]) {
        return await Promise.all(
            products.map(async ({ code, quantity }) => {
                const product = await this.productModel.findOne({ code }).exec();
                if (!product) throw new NotFoundException(`Product with code ${code} not found`);
                if (product.stock < quantity) throw new BadRequestException(`Insufficient stock for product with code: ${code}`);

                return {
                    ...product.toObject(),
                    quantity,
                    subtotal: product.price * quantity,
                };
            }),
        );
    }

    async updateOrderStatus(orderId: string, status: 'Processing' | 'Completed'): Promise<Checkout> {
        const order = await this.checkoutModel.findById(orderId);
        if (!order) throw new NotFoundException(`Order with ID ${orderId} not found`);

        order.status = status;
        await order.save();

        // Sync status update in Firebase
        await this.firebaseService.trackOrderStatus(orderId, status);

        return order;
    }

    //Retry Function
    private async updateProductStockWithRetry(productModel: Model<ProductDocument>, code: string, quantity: number, session: any, maxRetries = 3, retryDelay = 100) {
        let retries = 0;
        while (retries < maxRetries) {
            try {
                const product = await productModel.findOneAndUpdate(
                    { code, stock: { $gte: quantity } },
                    { $inc: { stock: -quantity } },
                    { new: true, session },
                );
                return product; // Success, return the product
            } catch (error) {
                if (error.code === 112) { // Write conflict
                    retries++;
                    await new Promise(resolve => setTimeout(resolve, retryDelay)); // Delay before retry
                } else {
                    throw error; // Other errors, re-throw
                }
            }
        }
        throw new Error('Max retries reached. Stock update failed.');
    }
}