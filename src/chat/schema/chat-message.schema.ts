// chat/schema/chat-message.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ChatMessageDocument = ChatMessage & Document;

@Schema({ timestamps: true })
export class ChatMessage {
  @Prop({ required: false })
  userId: string;

  @Prop({ required: true })
  content: string;

  @Prop({ required: true })
  type: string;
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);
