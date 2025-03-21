import { Prop, SchemaFactory } from "@nestjs/mongoose";

export type SupplyDocument = Supply & Document;
export class Supply{

 @Prop({ required: false })
  phone: string;

  @Prop({ type: Number, default: 0 })
  country: number;

  @Prop()
  name: string;

  @Prop({ type: String, default: null })
  image: string;

  @Prop({ required: false })
  state: string;

  @Prop({ type: Number, default: 0 })
  area: number;

  @Prop()
  lga: string;

  @Prop({ type: String, default: null })
  city: string;

  @Prop({ required: false })
  totalAmount: string;

  @Prop({ type: Number, default: 0 })
  unitPrice: number;

  @Prop()
  quantity: string;

  @Prop({ type: String, default: null })
  category: string;

  @Prop({ required: true })
  businessName: string;

  @Prop({ required: true })
  contactName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  phoneNumber: string;

  @Prop({ required: true })
  currency: string;

  @Prop({ required: true })
  accountDetails: string;

  @Prop({ required: true })
  address: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const SupplySchema = SchemaFactory.createForClass(Supply);