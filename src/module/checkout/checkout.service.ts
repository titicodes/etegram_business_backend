import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { Product, ProductDocument } from '../product/schema/product.schema';
import { User } from '../user/schema/user.schema';
import { Checkout, CheckoutDocument } from './schema/checkout.schema';
import { NotificationService } from '../notification/notification.service';
import { InvoiceService } from '../invoice/invoice.service';
import { EmailService } from '../email/email.service';
import { FirebaseService } from 'src/firebase/firebase.service';
import { UserService } from '../user/user.service';

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

    async scanProduct(code: string, cart: { code: string; quantity: number }[], ownerId: string, storeId: string): Promise<{ product: Product; cart: { code: string; quantity: number }[] }> {
        this.logger.log(`Scanning for checkout: Code=${code}, Owner=${ownerId}, Store=${storeId}`);

        // Convert storeId to ObjectId if it's not already
        const storeObjectId = typeof storeId === 'string' ? new Types.ObjectId(storeId) : storeId;

        // First try exact match
        let product = await this.productModel.findOne({
            code,
            owner: ownerId,
            store: storeObjectId
        }).exec();

        // If not found, try with flexible matching for the barcode
        if (!product) {
            this.logger.log(`Product not found with exact code. Trying case-insensitive search...`);
            product = await this.productModel.findOne({
                code: { $regex: new RegExp('^' + code + '$', 'i') },
                owner: ownerId,
                store: storeObjectId
            }).exec();
        }

        if (!product) {
            this.logger.log(`Product still not found. Checking if the product exists without store filter...`);
            const productAnyStore = await this.productModel.findOne({
                code,
                owner: ownerId
            }).exec();

            if (productAnyStore) {
                throw new BadRequestException(`Product with barcode ${code} exists but is not associated with the specified store (ID: ${storeId})`);
            } else {
                throw new NotFoundException(`Product with barcode ${code} not found in your store`);
            }
        }

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

    // Rest of the code remains the same...

    async createCheckout(createCheckoutDto: CreateCheckoutDto, user: User): Promise<Checkout> {
        const { cart, discount = 0, tax = 0, paymentMethod, storeId } = createCheckoutDto;

        if (!cart || cart.length === 0) {
            throw new BadRequestException('Cart cannot be empty.');
        }

        if (!storeId) {
            throw new BadRequestException('Store ID is required for checkout.');
        }
        // Pass storeId to validateAndFetchProducts
        const cartItems = await this.validateAndFetchProducts(cart, user._id.toString(), storeId);
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
                    // Pass storeId to updateProductStockWithRetry
                    const product = await this.updateProductStockWithRetry(
                        this.productModel,
                        code,
                        quantity,
                        session,
                        user._id.toString(),
                        storeId
                    );
                    if (!product) throw new BadRequestException(`Insufficient stock for product with code: ${code}`);
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
                    store: storeId, // Save the storeId in the checkout
                }], { session });

                this.logger.log('Checkout created successfully.');

                // Save needed data for post-transaction actions
                return { checkout };
            });

            const { checkout } = result;

            // 🔁 Post-transaction: Firebase updates, Email, Notification, Push
            for (const { code } of cartItems) {
                // Include storeId in the Firebase update query
                const product = await this.productModel.findOne({
                    code,
                    owner: user._id,
                    store: storeId
                });
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

    private async validateAndFetchProducts(products: { code: string; quantity: number }[], ownerId: string, storeId: string) {
        const storeObjectId = typeof storeId === 'string' ? new Types.ObjectId(storeId) : storeId;

        return await Promise.all(
            products.map(async ({ code, quantity }) => {
                // Updated to include storeId in the query
                const product = await this.productModel.findOne({
                    code,
                    owner: ownerId,
                    store: storeObjectId
                }).exec();

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

    // Updated to include storeId parameter
    async updateProductStockWithRetry(
        productModel: Model<ProductDocument>,
        code: string,
        quantity: number,
        session: ClientSession,
        ownerId: string,
        storeId: string,
        maxRetries = 3
    ): Promise<ProductDocument | null> {
        let retries = 0;
        const storeObjectId = typeof storeId === 'string' ? new Types.ObjectId(storeId) : storeId;

        while (retries < maxRetries) {
            try {
                // Updated to include storeId in the query
                const product = await productModel.findOne({
                    code,
                    owner: ownerId,
                    store: storeObjectId
                }).session(session);

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