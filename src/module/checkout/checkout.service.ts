import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose'; // Import Types
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

    async scanProduct(code: string, cart: { code: string; quantity: number }[], ownerId: string): Promise<{ product: Product; cart: { code: string; quantity: number }[] }> {
        const product = await this.productModel.findOne({ code, owner: ownerId }).exec();
        if (!product) throw new NotFoundException(`Product with barcode ${code} not found in your store`);

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

        const cartItems = await this.validateAndFetchProducts(cart, user._id.toString()); // Convert ObjectId to string
        const totalPrice = cartItems.reduce((acc, item) => acc + item.subtotal, 0);
        const discountedPrice = totalPrice - (totalPrice * discount) / 100;
        const totalPriceWithTax = discountedPrice + (discountedPrice * tax) / 100;

        const session = await this.checkoutModel.db.startSession();

        try {
            const result = await session.withTransaction(async () => {
                this.logger.log('Starting checkout transaction...');

                // Update stock in MongoDB within transaction
                for (const { code, quantity } of cartItems) {
                    this.logger.log(`Updating stock for product ${code}, quantity: ${quantity}`);
                    const product = await this.updateProductStockWithRetry(this.productModel, code, quantity, session, user._id.toString()); // Convert ObjectId to string
                    if (!product) throw new BadRequestException(`Insufficient stock for product with code: ${code}`);

                    // Firebase is outside the transaction, do it after commit
                }

                // Save checkout
                const [checkout] = await this.checkoutModel.create([{
                    cartItems,
                    totalPrice,
                    discountedPrice,
                    totalPriceWithTax,
                    user,
                    status: 'Completed',
                    createdAt: new Date(),
                    paymentMethod,
                }], { session });

                this.logger.log('Checkout created successfully.');

                // Save needed data for post-transaction actions
                return { checkout };
            });

            const { checkout } = result;

            // 🔁 Post-transaction: Firebase updates, Email, Notification, Push
            for (const { code } of cartItems) {
                const product = await this.productModel.findOne({ code, owner: user._id }); // Keep as ObjectId for database query
                if (product) await this.firebaseService.updateProductStock(product);
            }

            const invoice = await this.invoiceService.generateInvoice({
                ...checkout.toObject(),
                orderId: checkout._id.toString(),
                items: checkout.cartItems,
            });

            if (!user?.email) {
                throw new BadRequestException('User email is required to send an invoice.');
            }

            await this.emailService.sendInvoice(user.email, invoice);
            await this.firebaseService.trackOrderStatus(checkout._id.toString(), 'Completed');

            const userWithToken = await this.userService.findOne({ _id: user._id });
            if (userWithToken?.fcmToken) {
                await this.firebaseService.sendPushNotification(
                    userWithToken.fcmToken,
                    'Order Confirmed',
                    `Your order has been placed successfully! Total: ₦${totalPriceWithTax}`,
                );
            }

            await this.notificationService.sendOrderNotification(user, checkout);

            this.logger.log('Checkout process completed successfully.');
            return checkout;

        } catch (error) {
            this.logger.error('Checkout failed:', error);
            throw new InternalServerErrorException('Checkout failed. Please try again.');
        } finally {
            session.endSession();
        }
    }


    private async validateAndFetchProducts(products: { code: string; quantity: number }[], ownerId: string) {
        return await Promise.all(
            products.map(async ({ code, quantity }) => {
                const product = await this.productModel.findOne({ code, owner: ownerId }).exec();
                if (!product) throw new NotFoundException(`Product with code ${code} not found in your store`);
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
    async updateProductStockWithRetry(
        productModel: Model<ProductDocument>,
        code: string,
        quantity: number,
        session: ClientSession,
        ownerId: string, // Add ownerId here
        maxRetries = 3
    ): Promise<ProductDocument | null> {
        let retries = 0;

        while (retries < maxRetries) {
            try {
                const product = await productModel.findOne({ code, owner: ownerId }).session(session);
                if (!product) {
                    throw new BadRequestException(`Product with code ${code} not found in your store`);
                }

                if (product.stock < quantity) {
                    throw new BadRequestException(`Insufficient stock for product with code ${code}`);
                }

                product.stock -= quantity;

                await product.save({ session });

                return product;

            } catch (error) {
                if (this.isTransientTransactionError(error) && retries < maxRetries - 1) {
                    retries++;
                    this.logger.warn(`Transient error detected, retrying updateProductStock for ${code} (attempt ${retries + 1})`);
                    await new Promise((resolve) => setTimeout(resolve, 100 * (retries + 1))); // exponential backoff
                } else {
                    throw error;
                }
            }
        }

        return null;
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
            error.code === 251 // NoSuchTransaction code
        );
    }
}