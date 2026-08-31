import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Customer {
  @Prop()
  firstName: string;

  @Prop()
  lastName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop()
  currency: string;

  @Prop()
  phoneNumber?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Store', required: true })
  store: Types.ObjectId;

  @Prop({ default: true, unique: false })
  address?: string;

  @Prop()
  country: string;

  @Prop()
  birthday: string;

  @Prop()
  state?: string;

  @Prop()
  area: string;

  @Prop()
  extraPhone: string;

  @Prop()
  supplierType: string;

  @Prop()
  lga?: string;

  @Prop()
  extraDetails: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export type CustomerDocument = Customer & Document;
export const CustomerSchema = SchemaFactory.createForClass(Customer);
