import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class ProductHistory {
  @Prop({
    type: String,
    required: true,
    enum: [
      'restock',
      'adjustment',
      'sent_out',
      'received',
      'sale_adjustment' // <-- ADD THIS NEW VALUE
      
    ],
  })
  type: string;

  @Prop({ type: Number, required: true })
  quantity: number;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  product: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Store', required: true })
  store: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Deliveries' })
  deliveryAgentId?: Types.ObjectId;

  @Prop({ type: String })
  notes?: string;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

export type ProductHistoryDocument = ProductHistory & Document;
export const ProductHistorySchema = SchemaFactory.createForClass(ProductHistory);