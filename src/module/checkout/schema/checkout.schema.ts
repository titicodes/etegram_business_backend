import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';

export type CheckoutDocument = Checkout & Document;

@Schema()
export class Checkout {
  @Prop([{ type: mongoose.Schema.Types.Mixed }])
  cartItems: any[];

  @Prop()
  totalPrice: number;

  @Prop()
  discountedPrice: number;

  @Prop()
  totalPriceWithTax: number;

  @Prop()
  paymentMethod: string;

  @Prop()
  tax: number;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  user: Types.ObjectId;

  @Prop({ type: String, default: 'Pending' }) 
  status: 'Pending' | 'Processing' | 'Completed';
}

export const CheckoutSchema = SchemaFactory.createForClass(Checkout);
