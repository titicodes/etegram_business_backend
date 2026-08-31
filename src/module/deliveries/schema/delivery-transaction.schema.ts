import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class DeliveryTransaction {
  @Prop({ required: true })
  orderId: string;

  @Prop({ type: Types.ObjectId, ref: 'Store', required: true })
  store: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Deliveries', required: false })
  supplierId?: Types.ObjectId;

  @Prop([
    {
      productCode: { type: String, required: true },
      quantity: { type: Number, required: true, min: 1 },
    },
  ])
  items: { productCode: string; quantity: number }[];

  @Prop({ default: '' })
  notes: string;

  @Prop({
    enum: ['PENDING', 'DELIVERED', 'CANCELLED', 'RECEIVED'],
    default: 'PENDING',
  })
  status: string;
}

export type DeliveryTransactionDocument = DeliveryTransaction & Document;
export const DeliveryTransactionSchema =
  SchemaFactory.createForClass(DeliveryTransaction);
