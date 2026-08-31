import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { MailModule } from '../mail/mail.module';
import { OtpModule } from '../otp/otp.module';
import { User, UserSchema } from '../user/schema/user.schema';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UserModule } from '../user/user.module';
import { StoreModule } from '../store/store.module';
import { StoreService } from '../store/store.service';
import { Store, StoreSchema } from '../store/schema/store.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Store.name, schema: StoreSchema },
    ]),
    UserModule,
    PassportModule,
    MailModule,
    OtpModule,
    StoreModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, StoreService],
  exports: [AuthService], // Export AuthService for WalletModule
})
export class AuthModule {}
