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

@Module({
    imports: [
      MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
      UserModule,
      PassportModule,
      MailModule,
      OtpModule,
     
    ],
    controllers: [AuthController],
    providers: [AuthService, JwtStrategy],
    exports: [AuthService], // Export AuthService for WalletModule
  })
  export class AuthModule {}
  
