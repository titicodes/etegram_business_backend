import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs-extra';
import * as path from 'path';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  private async compileTemplate(
    templateName: string,
    data: any,
  ): Promise<string> {
    try {
      const filePath = path.join(
        __dirname,
        '..',
        '..',
        'templates',
        `${templateName}.hbs`,
      );
      const templateFile = await fs.readFile(filePath, 'utf8');
      const compiledTemplate = handlebars.compile(templateFile);
      return compiledTemplate(data);
    } catch (error) {
      console.error(`❌ Error compiling template ${templateName}:`, error);
      throw new Error('Email template compilation failed');
    }
  }

  async sendTemplatedEmail(
    to: string,
    subject: string,
    templateName: string,
    data: any,
    attachments?: { filename: string; path: string }[],
  ): Promise<void> {
    try {
      const html = await this.compileTemplate(templateName, data);

      const mailOptions = {
        from: `"Etegram Tech Solution" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
        attachments: attachments || [],
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`📧 Email sent to ${to}: ${info.messageId}`);
    } catch (error) {
      console.error('❌ Error sending email:', error);
      throw new Error('Failed to send email');
    }
  }

  async sendInvoice(email: string, invoice: any) {
    try {
      await this.sendTemplatedEmail(email, 'Your Order Invoice', 'invoice', {
        invoice,
      });
      console.log(`📧 Invoice sent successfully to ${email}`);
    } catch (error) {
      console.error('❌ Failed to send invoice:', error);
      throw new Error('Failed to send invoice');
    }
  }
}
