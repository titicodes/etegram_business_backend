

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Supply {
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

    @Prop({ required: true })
    country: string;

    @Prop({ required: true })
    state: string;

    @Prop({ required: true })
    lga: string;

    @Prop({ required: true })
    area: string;

    @Prop({ required: false })
    extraMobile?: string;

    @Prop({ default: Date.now })
    createdAt: Date;

    @Prop({ default: Date.now })
    updatedAt: Date;
}
export type SupplyDocument = Supply & Document;
export const SupplySchema = SchemaFactory.createForClass(Supply);