import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UnitOfMeasureDocument = UnitOfMeasure & Document;

@Schema()
export class UnitOfMeasure {
  @Prop()
  unitName: string;

  @Prop()
  baseUnit: string;

  @Prop()
  conversionFactor: number;
}

export const UnitOfMeasureSchema = SchemaFactory.createForClass(UnitOfMeasure);
