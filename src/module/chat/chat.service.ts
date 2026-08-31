import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ChatMessage, ChatMessageDocument } from './schema/chat-message.schema';
import { UserService } from 'src/module/user/user.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(ChatMessage.name)
    private chatMessageModel: Model<ChatMessageDocument>,
    private readonly userService: UserService,
  ) {}

  async getMessages(userId: string): Promise<ChatMessage[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }
    await this.userService.findById(userId);
    return this.chatMessageModel.find({ userId }).exec();
  }

  async sendMessage(
    userId: string | null,
    content: string,
    type: string,
  ): Promise<ChatMessage> {
    if (!content || !type) {
      throw new BadRequestException('Content and type are required');
    }
    if (userId && !Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }
    if (userId) {
      await this.userService.findById(userId);
    }
    const message = new this.chatMessageModel({ userId, content, type });
    return message.save();
  }
}
