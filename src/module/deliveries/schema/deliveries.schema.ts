import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { Document, Types } from "mongoose";
import { User } from "src/module/user/schema/user.schema";

@Schema({ timestamps: true })
export class Deliveries {
    @Prop()
    firstName: string

    @Prop()
    lastName: string

    @Prop({ required: true, unique: true })
    email: string;

    @Prop()
    phoneNumber?: string;

    @Prop({ default: true, unique: false })
    estate: string;

    @Prop()
    country: string;

    @Prop()
    state: string;

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

    @Prop({ required: true })
    orderId: string;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    user: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Store', required: true })
    store: Types.ObjectId;

    @Prop([
        {
            productCode: { type: String, required: true },
            quantity: { type: Number, required: true, min: 1 },
        },
    ])
    items: { productCode: string; quantity: number }[];

    @Prop({ type: Types.ObjectId, ref: 'Supply', required: false })
    supplierId?: Types.ObjectId;

    @Prop({ default: '' })
    notes: string;

    @Prop({ enum: ['PENDING', 'DELIVERED', 'CANCELLED'], default: 'PENDING' })
    status: string;

    @Prop({ default: Date.now })
    createdAt: Date;

    @Prop({ default: Date.now })
    updatedAt: Date;

}
export type DeliveriesDocument = Deliveries & Document;
export const DeliveriesSchem = SchemaFactory.createForClass(Deliveries);