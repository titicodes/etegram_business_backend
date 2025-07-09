import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InterestModule } from '../interest/interest.module';
import { RepositoryModule } from '../repository/repository.module';
import { User, UserSchema } from './schema/user.schema';
import { UserFactory } from './user-factory';
import { UserController } from './user.controller';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';
import { Store, StoreSchema } from '../store/schema/store.schema';
import { SubscriptionModule } from '../subscription/subscription.module';
import { Subscription, SubscriptionSchema } from '../subscription/schema/subscription.schema';
import { NotificationModule } from '../notification/notification.module';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Store.name, schema: StoreSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
    ]),
    InterestModule,
    RepositoryModule,
    forwardRef(() => SubscriptionModule),
    forwardRef(() => NotificationModule),
  ],
  controllers: [UserController],
  providers: [
    UserService,
    UserRepository,
    UserFactory,
  ],
  exports: [
    UserService,
    UserRepository,
    UserFactory,
  ],
})
export class UserModule { }