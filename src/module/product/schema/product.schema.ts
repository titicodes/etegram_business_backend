// In your product.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';

export type ProductDocument = Product & Document;

@Schema({ timestamps: true })
export class Product {
  @Prop()
  name: string;

  @Prop()
  description: string;

  @Prop()
  price: number;


  @Prop()
  category: string; // Now storing the category name

  @Prop({ required: true, unique: true })
  code: string;

  @Prop({ required: true })
  quantity: number;

  @Prop()
  image?: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  owner: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'ProductCategory' }) // Reference to ProductCategory
  categoryId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'UnitOfMeasure', required: true })
  unitId: Types.ObjectId;

  @Prop({ required: false, default: 0 })
  stock: number;

  @Prop({ required: false })
  size: string;

  @Prop({ required: false })
  totalQuantity: number;

  @Prop({ required: false })
  totalCost: number;

  @Prop({ required: false })
  unitPrice: number;

  @Prop({ required: false })
  minQuantity: number;

  @Prop({ required: false })
  expiryDate: string;

  @Prop({ required: false })
  supplyTo?: string;

  @Prop() // Add brand field
  brands: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true })
  store: Types.ObjectId; // Add store reference
}
export const ProductSchema = SchemaFactory.createForClass(Product);