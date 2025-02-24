import { Controller, Post, Body } from '@nestjs/common';
import { EmailService } from './email.service';

@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('send-invoice')
  async sendInvoice(@Body() body: { email: string; invoice: any }) {
    await this.emailService.sendInvoice(body.email, body.invoice);
    return { message: 'Invoice sent successfully' };
  }
}
