import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { Document } from "mongoose";
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

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
    user: User;

}
export type DeliveriesDocument = Deliveries & Document;
export const DeliveriesSchem = SchemaFactory.createForClass(Deliveries);