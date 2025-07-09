// import { Injectable } from '@nestjs/common';
// import * as nodemailer from 'nodemailer';
// import * as handlebars from 'handlebars';
// import * as fs from 'fs-extra';
// import * as path from 'path';

// @Injectable()
// export class EmailService {
//     private transporter: nodemailer.Transporter;

//     constructor() {
//         this.transporter = nodemailer.createTransport({
//             service: 'gmail',
//             auth: {
//                 user: process.env.EMAIL_USER,
//                 pass: process.env.EMAIL_PASS,
//             },
//         });
//     }

//     private async compileTemplate(templateName: string, data: any): Promise<string> {
//         try {
//             const filePath = path.join(process.cwd(), 'src', 'templates', `${templateName}.hbs`);
//             const templateFile = await fs.readFile(filePath, 'utf8');
//             const compiledTemplate = handlebars.compile(templateFile);
//             return compiledTemplate(data);
//         } catch (error) {
//             console.error(`❌ Error compiling template ${templateName}:`, error);
//             throw new Error('Email template compilation failed');
//         }
//     }

//     async sendTemplatedEmail(
//         to: string,
//         subject: string,
//         templateName: string,
//         data: any,
//         attachments?: { filename: string; path: string }[],
//     ): Promise<void> {
//         try {
//             if (!to) {
//                 console.error('❌ No recipient email provided.');
//                 throw new Error('Recipient email is required.');
//             }

//             const html = await this.compileTemplate(templateName, data);

//             const mailOptions = {
//                 from: `"Etegram Tech Solution" <${process.env.EMAIL_USER}>`,
//                 to,
//                 subject,
//                 html,
//                 attachments: attachments || [],
//             };

//             const info = await this.transporter.sendMail(mailOptions);
//             console.log(`📧 Email sent to ${to}: ${info.messageId}`);
//         } catch (error) {
//             console.error('❌ Error sending email:', error);
//             throw new Error('Failed to send email');
//         }
//     }

//     async sendInvoice(email: string, invoice: any) {
//         try {
//             if (!email) {
//                 console.error('❌ No email provided for sending invoice.');
//                 throw new Error('Recipient email is missing.');
//             }

//             console.log(`📧 Sending invoice to ${email}...`);
//             await this.sendTemplatedEmail(email, 'Your Order Invoice', 'invoice', { invoice });
//             console.log(`📧 Invoice sent successfully to ${email}`);
//         } catch (error) {
//             console.error('❌ Failed to send invoice:', error);
//             throw new Error('Failed to send invoice');
//         }
//     }
// }

import { Injectable, Logger } from '@nestjs/common';
import * as SibApiV3Sdk from 'sib-api-v3-sdk';
import * as handlebars from 'handlebars';
import * as fs from 'fs-extra';
import * as path from 'path';

@Injectable()
export class EmailService {
    private readonly brevoClient: SibApiV3Sdk.TransactionalEmailsApi;
    private readonly logger = new Logger(EmailService.name);

    constructor() {
        const apiKey = process.env.BREVO_API_KEY;

        if (!apiKey) {
            throw new Error('❌ BREVO_API_KEY is missing in environment variables');
        }

        const defaultClient = SibApiV3Sdk.ApiClient.instance;

        // ✅ Use 'api-key' instead of 'apiKey'
        const apiKeyAuth = defaultClient.authentications['api-key'];
        if (!apiKeyAuth) {
            throw new Error('❌ Brevo SDK client does not expose api-key authentication');
        }

        apiKeyAuth.apiKey = apiKey;

        // ✅ Initialize the transactional email client
        this.brevoClient = new SibApiV3Sdk.TransactionalEmailsApi();

        this.logger.log('✅ Brevo EmailService initialized successfully');
    }



    private async compileTemplate(templateName: string, data: Record<string, any>): Promise<string> {
        try {
            const filePath = path.join(process.cwd(), 'src', 'templates', `${templateName}.hbs`);
            const templateContent = await fs.readFile(filePath, 'utf8');
            const template = handlebars.compile(templateContent);
            return template(data);
        } catch (error) {
            this.logger.error(`Failed to compile template "${templateName}"`, error);
            throw new Error(`Template compilation error: ${templateName}`);
        }
    }


    async sendTemplatedEmail(
  to: string,
  subject: string,
  templateName: string,
  data: Record<string, any>,
  attachments?: { name: string; path: string }[]
): Promise<void> {
  try {
    const htmlContent = await this.compileTemplate(templateName, data);

    const sendSmtpEmail: SibApiV3Sdk.SendSmtpEmail = {
      to: [{ email: to }],
      sender: {
        name: process.env.EMAIL_FROM_NAME || 'Your App Name',
        email: process.env.EMAIL_FROM_ADDRESS!,
      },
      subject,
      htmlContent,
      attachments: attachments?.map((file) => ({
        name: file.name,
        content: fs.readFileSync(file.path).toString('base64'),
      })),
    };

    const result = await this.brevoClient.sendTransacEmail(sendSmtpEmail);
    this.logger.log(`📧 Custom template email sent to ${to}: ${result?.messageId || 'No ID'}`);
  } catch (error: any) {
    this.logger.error(
      `❌ Failed to send custom email with Brevo to ${to}:`,
      {
        error: error?.response?.body || error.message,
        status: error?.response?.status,
        headers: error?.response?.headers,
      }
    );
    throw new Error('Email sending failed');
  }
}

    async sendEmailWithTemplate(to: string, templateId: number, params: Record<string, any>): Promise<void> {
        try {
            const sendSmtpEmail: SibApiV3Sdk.SendSmtpEmail = {
                to: [{ email: to }],
                sender: {
                    name: process.env.EMAIL_FROM_NAME || 'Your App Name',
                    email: process.env.EMAIL_FROM_ADDRESS!,
                },
                templateId,
                params,
            };

            const result = await this.brevoClient.sendTransacEmail(sendSmtpEmail);
            this.logger.log(`📨 Brevo template email sent to ${to}: ${result?.messageId || 'No ID'}`);
        } catch (error: any) {
            this.logger.error('❌ Failed to send Brevo template email:', error?.response?.body || error);
            throw new Error('Brevo template email sending failed');
        }
    }

    async sendInvoice(email: string, invoice: any) {
        await this.sendTemplatedEmail(email, 'Your Order Invoice', 'invoice', { invoice });
    }
}

