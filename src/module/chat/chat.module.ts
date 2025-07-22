// chat/chat.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatMessage, ChatMessageSchema } from './schema/chat-message.schema';
import { UserModule } from 'src/module/user/user.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChatMessage.name, schema: ChatMessageSchema },
    ]),
    UserModule,
  ],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService], // 👈 Only if needed in another module
})
export class ChatModule {}
