import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { User } from 'src/module/user/schema/user.schema';

export type StoreDocument = Store & Document;

@Schema()
export class Store {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  classification: string;

  @Prop({ required: true })
  country: string;

  @Prop({ required: true })
  state: string;

  @Prop({ required: true })
  lga: string;

  @Prop({ required: true })
  currency: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  owner: User;

  
  @Prop({ required: false })
  area?: string;
  
}

export const StoreSchema = SchemaFactory.createForClass(Store);