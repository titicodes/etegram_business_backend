// payment-method/payment-method.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from 'src/module/user/schema/user.schema';


export type PaymentMethodDocument = PaymentMethod & Document;

@Schema()
export class PaymentMethod {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  user: User;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  bank: string;

  @Prop({ required: true })
  accountNumber: string;

  @Prop({ required: true })
  accountName: string;

  @Prop({ required: false })
  extraInfo?: string;
}

export const PaymentMethodSchema = SchemaFactory.createForClass(PaymentMethod); // Ensure this line exists