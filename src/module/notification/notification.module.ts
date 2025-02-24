import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { FirebaseModule } from 'src/firebase/firebase.module';
import { NotificationController } from './notification.controller';

@Module({
  imports: [FirebaseModule],
  providers: [NotificationService],
  controllers: [NotificationController],
  exports: [NotificationService],
})
export class NotificationModule {}
