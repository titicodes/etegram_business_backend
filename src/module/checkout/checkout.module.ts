import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from '../product/schema/product.schema';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { Checkout, CheckoutSchema } from './schema/checkout.schema';
import { NotificationModule } from '../notification/notification.module';
import { InvoiceService } from '../invoice/invoice.service';
import { EmailModule } from '../email/email.module';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Checkout.name, schema: CheckoutSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
    NotificationModule,
    EmailModule,
    FirebaseModule,
    UserModule,
  ],
  controllers: [CheckoutController],
  providers: [CheckoutService, InvoiceService],
  exports: [CheckoutService],
})
export class CheckoutModule {}
