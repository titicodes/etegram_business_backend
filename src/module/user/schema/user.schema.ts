import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { Interest } from 'src/module/interest/schemas/interest.schema';
import { Store } from 'src/module/store/schema/store.schema';

@Schema({ timestamps: true })
export class User {
  @Prop({ default: false, required: false })
  deviceToken: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: false })
  phone: string;

  @Prop({ type: Number, default: 0 })
  point: number;

  @Prop()
  name: string;

  @Prop({ type: String, default: null })
  image: string;

  @Prop({ default: false })
  isAdmin: boolean;

  @Prop({ type: Number, default: 0 })
  balance: number;

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop({ select: false })
  password: string;

  @Prop()
  country: string;

  @Prop()
  state: string;

  @Prop()
  city: string;

  @Prop()
  area: string;

  @Prop()
  birthday: Date;

  @Prop()
  username: string;

  @Prop({ default: '' })
  firstName: string;

  @Prop({ type: Number, default: 1111 })
  pin: number;

  @Prop({ type: Boolean, default: false })
  defaultPinChanged: boolean;

  @Prop({ default: '' })
  lastName: string;

  @Prop({ default: '' })
  bio: string;

  @Prop({ default: '' })
  currency: string;

  @Prop({ default: '' })
  businessType: string;

  @Prop({ default: '' })
  businessName: string;

  @Prop({ default: '' })
  profilePhoto: string;

  @Prop({ type: [mongoose.Schema.Types.ObjectId], ref: Interest.name })
  interests: mongoose.Types.ObjectId[];

  @Prop({ default: 0 }) // Wallet balance initialized to 0
  wallet: number;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Auth' })
  auth: any;

  @Prop({ default: false })
  isGoogleAuth: boolean;

  @Prop()
  refreshToken: string;

  @Prop({ default: false })
  isPremium: boolean;

  @Prop({ default: null })
  subscriptionType: string; // 'monthly' or 'yearly'

  @Prop({ default: null })
  subscriptionStartDate: Date;

  @Prop({ default: null })
  subscriptionEndDate: Date;

  @Prop({ type: String })
  twoFactorAuthenticationSecret?: string;

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Store' }] })
  stores: Store[];
}
export type UserDocument = User & Document;
export const UserSchema = SchemaFactory.createForClass(User);
