import { Controller, Get, Res } from '@nestjs/common';
import { MailService } from './mail.service';

@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Get()
  sendMailer(@Res() response: any) {
    const mail = this.mailService.sendEmail;

    return response.status(200).json({
      message: 'success',
      mail,
    });
  }
}
