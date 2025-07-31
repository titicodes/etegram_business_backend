import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class PaymentMethod extends Document {
  @Prop({ enum: ['CASH', 'CARD', 'TRANSFER'], required: true })
  type: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Store', required: true })
  store: Types.ObjectId;

  @Prop({ default: '' })
  details: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;

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

  @Prop()
  deliveryAddress?: string;

  @Prop()
  customerName?: string;
}

export type PaymentMethodDocument = PaymentMethod & Document;
export const PaymentMethodSchema = SchemaFactory.createForClass(PaymentMethod);
