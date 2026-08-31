import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Deliveries {
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  phoneNumber: string;

  @Prop()
  extraPhone?: string;

  @Prop({ required: true })
  estate: string;

  @Prop({ required: true })
  country: string;

  @Prop({ required: true })
  state: string;

  @Prop({ required: true })
  city: string;

  @Prop({ required: true })
  area: string;

  @Prop({ required: true })
  supplierType: string;

  @Prop()
  extraDetails?: string;

  @Prop({ type: Types.ObjectId, ref: 'Store', required: true })
  store: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ default: 'ACTIVE' })
  status: string;
}

export type DeliveriesDocument = Deliveries & Document;
export const DeliveriesSchema = SchemaFactory.createForClass(Deliveries);
