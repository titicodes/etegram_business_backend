// payment-method/payment-method.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentMethodController } from './payment-method.controller';
import { PaymentMethodService } from './payment-method.service';
import { PaymentMethod, PaymentMethodSchema } from './schema/payment-method.schema';
import { UserModule } from '../user/user.module';


@Module({
  imports: [MongooseModule.forFeature([{ name: PaymentMethod.name, schema: PaymentMethodSchema }]),UserModule],
  controllers: [PaymentMethodController],
  providers: [PaymentMethodService],
  exports: [PaymentMethodService],
})
export class PaymentMethodModule { }