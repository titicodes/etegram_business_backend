import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProductHistoryDocument = ProductHistory & Document;

@Schema({ timestamps: true })
export class ProductHistory {
    @Prop({ required: true, enum: ['sale', 'restock', 'adjustment'] })
    type: string;

    @Prop({ required: true })
    quantity: number;

    @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
    product: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Store', required: true })
    store: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId: Types.ObjectId;

    @Prop()
    notes?: string;
}

export const ProductHistorySchema = SchemaFactory.createForClass(ProductHistory);