// product-category.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProductCategoryDocument = ProductCategory & Document;

@Schema()
export class ProductCategory extends Document { // Extend Document here
  @Prop()
  categoryName: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;
}

export const ProductCategorySchema =
  SchemaFactory.createForClass(ProductCategory);
