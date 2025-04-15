import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { User } from 'src/module/user/schema/user.schema';

export type ExpenseDocument = Expense & Document;

@Schema()
export class Expense {
    @Prop({ required: true })
    description: string;

    @Prop({ required: true })
    amount: number;

    @Prop({ required: true })
    category: string; // e.g., "Utilities", "Salaries", "Supplies"

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
    user: User;

    @Prop({ default: Date.now })
    date: Date;

    @Prop()
    notes?: string;

    @Prop()
    currency?: string;
}

export const ExpenseSchema = SchemaFactory.createForClass(Expense);