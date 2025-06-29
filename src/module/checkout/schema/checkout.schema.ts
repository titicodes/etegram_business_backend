// import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
// import { Document, Types } from 'mongoose';

// @Schema({ timestamps: true })
// export class Checkout extends Document {
//   @Prop([
//     {
//       code: { type: String, required: true },
//       quantity: { type: Number, required: true, min: 1 },
//       subtotal: { type: Number, required: true, min: 0 },
//       product: { type: Object, required: true },
//     },
//   ])
//   cartItems: { code: string; quantity: number; subtotal: number; product: any }[];

//   @Prop({ required: true, min: 0 })
//   totalPrice: number;

//   @Prop({ required: true, min: 0 })
//   discountedPrice: number;

//   @Prop({ required: true, min: 0 })
//   totalPriceWithTax: number;

//   @Prop({ type: Types.ObjectId, ref: 'User', required: true })
//   user: Types.ObjectId;

//   @Prop({ type: Types.ObjectId, ref: 'Store', required: true })
//   store: Types.ObjectId;

//   @Prop({ required: true, enum: ['Processing', 'Completed'] })
//   status: 'Processing' | 'Completed';

//   @Prop({ required: true, enum: ['CASH', 'CARD', 'TRANSFER'] })
//   paymentMethod: string;

//   @Prop({ default: Date.now })
//   createdAt: Date;

//    @Prop({ required: false, })
//   size?: string;

// }

// export type CheckoutDocument = Checkout & Document;
// export const CheckoutSchema = SchemaFactory.createForClass(Checkout);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Product } from 'src/module/product/schema/product.schema';

@Schema()
export class CartItem {
  @Prop({ required: true })
  code: string;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  subtotal: number;

  @Prop({ type: Object, required: true })
  product: Product;
}

@Schema({ timestamps: true })
export class Checkout {
  @Prop({ type: [{ type: Object }], required: true })
  cartItems: CartItem[];

  @Prop({ required: true })
  totalPrice: number;

  @Prop({ required: true })
  discountedPrice: number;

  @Prop({ required: true })
  totalPriceWithTax: number;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: String, enum: ['Pending', 'Processing', 'Completed'], default: 'Pending' })
  status: string;

  @Prop({ required: true })
  paymentMethod: string;

  @Prop({ type: Types.ObjectId, ref: 'Store', required: true })
  store: Types.ObjectId;

  @Prop({ default: false })
  isCredit: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  customerId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Supplier' })
  supplierId?: Types.ObjectId;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

export type CheckoutDocument = Checkout & Document;
export const CheckoutSchema = SchemaFactory.createForClass(Checkout);