import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from 'src/module/user/schema/user.schema';

export type SubscriptionDocument = Subscription & Document;

@Schema({ timestamps: true })
export class Subscription {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId | User;

  @Prop({ required: true, enum: ['TRIAL', 'PREMIUM', 'EXPIRED', 'CANCELLED'] })
  status: string;

  @Prop({ enum: ['NONE', 'MONTHLY', 'YEARLY'], default: 'NONE' })
  subscriptionType: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  trialStartDate?: Date;

  @Prop()
  trialEndDate?: Date;

  @Prop()
  startDate?: Date;

  @Prop()
  endDate?: Date;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);
