import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

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
  category: string;

  @Prop({ required: true, unique: true })
  code: string;

  @Prop({ required: true })
  quantity: number;

  @Prop()
  image?: string;

  @Prop({ required: true })
  categoryId: string;

  @Prop({ type: Types.ObjectId, ref: 'UnitOfMeasure' }) // Use ObjectId and reference
  unitId: string;

  @Prop({ required: true, autoIncrement: true })
  productId: number;

  @Prop({ required: true, default: 0 })
  stock: number;
}
export const ProductSchema = SchemaFactory.createForClass(Product);
