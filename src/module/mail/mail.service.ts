import { MailerService } from '@nestjs-modules/mailer/dist';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MailService {
  constructor(private mailerService: MailerService) {}

  async sendEmail(toEmail: string, subject: string, template: string) {
    await this.mailerService.sendMail({
      to: toEmail,
      subject,
      html: template,
    });
  }
}
