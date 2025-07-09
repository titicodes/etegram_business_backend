import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Store } from '../../store/schema/store.schema';
import { UserRoleEnum } from 'src/common/enums/user.enum';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  firstName: string;

  _id: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop()
  phoneNumber?: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Store' }], default: [] })
  stores: Types.ObjectId[] | Store[];

  @Prop({ type: Types.ObjectId, ref: 'Store' })
  store?: Types.ObjectId | Store;

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop({ type: [String], enum: UserRoleEnum, default: [UserRoleEnum.STORE_OWNER] })
  role: UserRoleEnum[];

  @Prop()
  country?: string;

  @Prop()
  state?: string;

  @Prop()
  city?: string;

  @Prop()
  area?: string;

  @Prop()
  currency?: string;

  @Prop({ unique: true, sparse: true })
  referralCode?: string;

  @Prop()
  businessType?: string;

  @Prop()
  businessName?: string;

  @Prop()
  refreshToken?: string;

  @Prop({ default: '1111' })
  pin: string;

  @Prop({ default: false })
  defaultPinChanged: boolean;

  @Prop()
  fcmToken?: string;

  @Prop()
  imageUrl?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);