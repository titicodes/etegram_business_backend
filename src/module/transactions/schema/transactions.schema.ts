import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Transactions {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: ['debit', 'credit'] })
  type: 'debit' | 'credit';

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  paymentMethod: string;

  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true, default: 'pending' })
  status: string;
}
export type TransactionDocument = Transactions & Document;
export const TransactionSchema = SchemaFactory.createForClass(Transactions);
