
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Product extends Document {
  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ required: true, unique: false })
  code: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true, default: 0 })
  stock: number;

  @Prop({ type: Types.ObjectId, ref: 'ProductCategory' })
  categoryId: Types.ObjectId;

  @Prop()
  category: string;

  @Prop([String])
  brands?: string[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  owner: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Store', required: true })
  store: Types.ObjectId;

  @Prop()
  expiryDate?: Date;

  @Prop()
  unitPrice?: number;

  @Prop({ required: true })
  quantity: number;

  @Prop()
  imageUrl?: string;


  @Prop({ required: false })
  size: string;

  @Prop({ required: false })
  totalQuantity: number;


  @Prop({ required: false })
  supplyTo?: string;

  @Prop({ min: 0 })
  costPrice?: number;

  @Prop({ type: Types.ObjectId, required: true })
  createdBy: Types.ObjectId;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;

}

export type ProductDocument = Product & Document;
export const ProductSchema = SchemaFactory.createForClass(Product);

// Ensure unique product code per store and owner
ProductSchema.index({ code: 1, owner: 1, store: 1 }, { unique: true });

