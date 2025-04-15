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
    DeliveriesModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
