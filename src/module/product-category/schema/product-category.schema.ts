import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProductCategoryDocument = ProductCategory & Document;

@Schema()
export class ProductCategory {
  @Prop()
  categoryName: string;
}

export const ProductCategorySchema =
  SchemaFactory.createForClass(ProductCategory);
