import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Store, StoreSchema } from '../store/schema/store.schema';
import { User, UserSchema } from '../user/schema/user.schema';
import { UserModule } from '../user/user.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ProductModule } from '../product/product.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { StoreModule } from '../store/store.module';
import { CheckoutModule } from '../checkout/checkout.module';

@Module({
   imports:[
     MongooseModule.forFeature([{ name: User.name, schema: UserSchema }, { name: Store.name, schema: StoreSchema }]),
        UserModule,
        ProductModule,
        SubscriptionModule,
        StoreModule,
        CheckoutModule

   ],
   controllers:[AdminController],
   providers:[AdminService] 
})
export class AdminModule {}
