import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { OtpTypeEnum } from 'src/common/constants/enums/otp.enum';

export type OTPDocument = OTP & Document;

@Schema({ expires: 300 })
export class OTP {
  @Prop({ required: false, unique: true })
  email?: string;

  @Prop({ required: false, unique: true })
  phone?: string;

  @Prop({ required: true })
  code: number;

  @Prop({ required: true, enum: OtpTypeEnum })
  type: string;

  @Prop({ default: Date.now, expires: 300 }) // This handles expiration
  createdAt: Date;
}

export const OTPSchema = SchemaFactory.createForClass(OTP);
