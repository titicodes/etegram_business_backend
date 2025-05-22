import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';
import { UserRoleEnum } from 'src/common/enums/user.enum';
import { Interest } from 'src/module/interest/schemas/interest.schema';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop()
  phone: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Store' }], default: [] })
  stores: Types.ObjectId[];

  @Prop()
  refreshToken?: string;

  @Prop()
  fcmToken?: string;

  @Prop({ default: '1111' })
  pin: string;

  @Prop({ default: false })
  defaultPinChanged: boolean;

  @Prop({ default: false, required: false })
  deviceToken: string;

  // _id: Types.ObjectId;

  @Prop({ type: Number, default: 0 })
  point: number;


  @Prop({ type: String, default: null })
  image: string;

  @Prop({ default: false })
  isAdmin: boolean;

  @Prop({ type: Number, default: 0 })
  balance: number;

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop({ type: [String], enum: UserRoleEnum, default: [UserRoleEnum.CUSTOMER] })
  role: UserRoleEnum[];

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

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Store', default: null })
  store: mongoose.Types.ObjectId;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;

}

export type UserDocument = User & Document;
export const UserSchema = SchemaFactory.createForClass(User);