import { forwardRef, Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { NotificationController } from './notification.controller';
import { UserModule } from '../user/user.module';


@Module({
  imports: [
    FirebaseModule,
    forwardRef(() => UserModule),
  ],
  providers: [NotificationService],
  controllers: [NotificationController],
  exports: [NotificationService],
})
export class NotificationModule { }