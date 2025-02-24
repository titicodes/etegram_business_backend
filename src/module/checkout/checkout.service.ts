import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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

@Injectable()
export class CheckoutService {
  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(Checkout.name) private readonly checkoutModel: Model<CheckoutDocument>,
    private readonly notificationService: NotificationService,
    private readonly invoiceService: InvoiceService,
    private readonly emailService: EmailService,
    private readonly firebaseService: FirebaseService,
  ) {}

  async scanBarcode(code: string): Promise<Product> {
    const product = await this.productModel.findOne({ code }).exec();
    if (!product) throw new NotFoundException(`Product with barcode ${code} not found`);
    return product;
  }

  async scanProduct(code: string): Promise<Product> {
    const product = await this.scanBarcode(code);
    
    // ✅ Update Firebase stock
    await this.firebaseService.updateProductStock(product);
    
    // ✅ Return updated product
    return this.productModel.findOne({ code }).exec(); 
  }

  async createCheckout(createCheckoutDto: CreateCheckoutDto, user: User): Promise<Checkout> {
    const { products, discount = 0, tax = 0 } = createCheckoutDto;
    const cartItems = await this.validateAndFetchProducts(products);

    const totalPrice = cartItems.reduce((acc, item) => acc + item.subtotal, 0);
    const discountedPrice = totalPrice - (totalPrice * discount) / 100;
    const totalPriceWithTax = discountedPrice + (discountedPrice * tax) / 100;

    // ✅ Atomic Stock Deduction
    await Promise.all(
      cartItems.map(async ({ code, quantity }) => {
        const product = await this.productModel.findOneAndUpdate(
          { code, stock: { $gte: quantity } },
          { $inc: { stock: -quantity } },
          { new: true }
        );
        if (!product) throw new BadRequestException(`Insufficient stock for ${code}`);

        // ✅ Sync stock update to Firebase
        await this.firebaseService.updateProductStock(product);
      }),
    );

    const checkout = await this.checkoutModel.create({
      cartItems,
      totalPrice,
      discountedPrice,
      totalPriceWithTax,
      user,
      status: 'Pending',
      createdAt: new Date(),
    });

    // ✅ Generate & Send Invoice
    const invoice = await this.invoiceService.generateInvoice(checkout);
    await this.emailService.sendInvoice(user.email, invoice);

    // ✅ Track Order in Firebase
    await this.firebaseService.trackOrderStatus(checkout._id.toString(), 'Pending');

    // ✅ Send Notifications
    await this.notificationService.sendOrderNotification(user, checkout);
    await this.firebaseService.sendPushNotification(
      user.deviceToken,
      'Order Confirmed',
      `Your order has been placed successfully! Total: ₦${totalPriceWithTax}`,
    );

    return checkout;
  }

  async updateOrderStatus(orderId: string, status: 'Processing' | 'Completed'): Promise<Checkout> {
    const order = await this.checkoutModel.findById(orderId);
    if (!order) throw new NotFoundException(`Order with ID ${orderId} not found`);

    order.status = status;
    await order.save();

    // ✅ Sync status change in Firebase
    await this.firebaseService.trackOrderStatus(orderId, status);

    return order;
  }

  private async validateAndFetchProducts(products: { code: string; quantity: number }[]) {
    return await Promise.all(
      products.map(async ({ code, quantity }) => {
        const product = await this.productModel.findOne({ code }).exec();
        if (!product) throw new NotFoundException(`Product with code ${code} not found`);

        // ✅ Ensure sufficient stock
        if (product.stock < quantity) throw new BadRequestException(`Insufficient stock for ${code}`);

        return {
          ...product.toObject(),
          quantity,
          subtotal: product.price * quantity,
        };
      }),
    );
  }
}
