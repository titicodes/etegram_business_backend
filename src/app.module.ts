import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './module/database/database.module';
import { MailModule } from './module/mail/mail.module';
import { OtpModule } from './module/otp/otp.module';
import { RepositoryModule } from './module/repository/repository.module';
import { InterestModule } from './module/interest/interest.module';
import { AuthModule } from './module/auth/auth.module';
import { UserModule } from './module/user/user.module';
import { JwtModule } from '@nestjs/jwt';
import { ENVIRONMENT } from './common/config/environment';
import { CheckoutModule } from './module/checkout/checkout.module';
import { UnitOfMeasureModule } from './module/unit-of-measure/unit-of-measure.module';
import { ProductModule } from './module/product/product.module';
import { ProductCategoryModule } from './module/product-category/product-category.module';
import { NotificationModule } from './module/notification/notification.module';
import { FirebaseModule } from './firebase/firebase.module';
import { EmailModule } from './module/email/email.module';
import { StoreModule } from './module/store/store.module';
import { SupplierModule } from './module/supply/supply.module';
import { PaymentMethodModule } from './module/payment-method/payment-method.module';
import { CustomerModule } from './module/customer/customer.module';
import { ExpenseModule } from './module/expenses/expenses.module';
import { DeliveriesModule } from './module/deliveries/deliveries.module';
import { ChatService } from './chat/chat.service';
import { ChatModule } from './chat/chat.module';
import { SubscriptionModule } from './module/subscription/subscription.module';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';


@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    UserModule,
    OtpModule,
    MailModule,
    InterestModule,
    RepositoryModule,
    JwtModule.registerAsync({
      useFactory: async () => ({
        secret: ENVIRONMENT.JWT.SECRET,
        signOptions: {
          expiresIn: '3600s',
        },
      }),
      global: true,
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [() => ENVIRONMENT],
    }),
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          callback(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/image\/(jpg|jpeg|png|gif)/)) {
          callback(new Error('Only image files are allowed'), false);
        } else {
          callback(null, true);
        }
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    }),
    ProductModule,
    ProductCategoryModule,
    UnitOfMeasureModule,
    CheckoutModule,
    UserModule,
    NotificationModule,
    FirebaseModule,
    EmailModule,
    StoreModule,
    SupplierModule,
    PaymentMethodModule,
    CustomerModule,
    ExpenseModule,
    DeliveriesModule,
    SubscriptionModule,
    ChatModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
