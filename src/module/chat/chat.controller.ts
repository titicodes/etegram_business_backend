import {
  Controller,
  Get,
  Post,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from 'src/module/auth/guard/jwtGuard';

@Controller('messages')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getMessages(@Request() req) {
    return this.chatService.getMessages(req.user._id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async sendMessage(
    @Request() req,
    @Body() body: { content: string; type: string },
  ) {
    return this.chatService.sendMessage(req.user._id, body.content, body.type);
  }
}
