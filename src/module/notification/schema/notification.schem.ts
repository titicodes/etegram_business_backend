import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum NotificationType {
    SYSTEM = 'SYSTEM',
    PROMOTIONAL = 'PROMOTIONAL',
    ORDER = 'ORDER',
    SUBSCRIPTION = 'SUBSCRIPTION',
    LOW_STOCK = 'LOW_STOCK',
}

@Schema({ timestamps: true })
export class Notification {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    user: Types.ObjectId;

    @Prop({ required: true })
    title: string;

    @Prop({ required: true })
    body: string;

    @Prop({ type: String, enum: NotificationType, default: NotificationType.SYSTEM })
    type: NotificationType;

    @Prop({ default: false })
    isRead: boolean;

    @Prop({ type: Object })
    data?: Record<string, any>;
}

export type NotificationDocument = Notification & Document;
export const NotificationSchema = SchemaFactory.createForClass(Notification);