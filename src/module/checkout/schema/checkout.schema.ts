import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Checkout extends Document {
  @Prop([
    {
      code: { type: String, required: true },
      quantity: { type: Number, required: true, min: 1 },
      subtotal: { type: Number, required: true, min: 0 },
      product: { type: Object, required: true },
    },
  ])
  cartItems: { code: string; quantity: number; subtotal: number; product: any }[];

  @Prop({ required: true, min: 0 })
  totalPrice: number;

  @Prop({ required: true, min: 0 })
  discountedPrice: number;

  @Prop({ required: true, min: 0 })
  totalPriceWithTax: number;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Store', required: true })
  store: Types.ObjectId;

  @Prop({ required: true, enum: ['Processing', 'Completed'] })
  status: 'Processing' | 'Completed';

  @Prop({ required: true, enum: ['CASH', 'CARD', 'TRANSFER'] })
  paymentMethod: string;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export type CheckoutDocument = Checkout & Document;
export const CheckoutSchema = SchemaFactory.createForClass(Checkout);