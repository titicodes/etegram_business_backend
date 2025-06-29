import { Module } from '@nestjs/common';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Store, StoreSchema } from '../store/schema/store.schema';
import { User, UserSchema } from '../user/schema/user.schema';
import { Subscription, SubscriptionSchema } from './schema/subscription.schema';
import { NotificationService } from '../notification/notification.service';
import { FirebaseService } from 'src/firebase/firebase.service';

@Module({
  imports: [MongooseModule.forFeature([
    { name: User.name, schema: UserSchema },
    { name: Subscription.name, schema: SubscriptionSchema },

  ]),],
  providers: [SubscriptionService, NotificationService, FirebaseService],
  controllers: [SubscriptionController]
})
export class SubscriptionModule { }
