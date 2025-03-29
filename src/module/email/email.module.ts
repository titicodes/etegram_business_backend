import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';

@Module({
   imports: [
      ConfigModule.forRoot(),
      MailerModule.forRootAsync({
        imports: [ConfigModule],
        useFactory: async (config: ConfigService) => ({
          transport: {
            host: config.get<string>('MAIL_HOST'),
            port: config.get<number>('MAIL_PORT'),
            secure: true,
            auth: {
              user: config.get<string>('EMAIL_USER'),
              pass: config.get<string>('EMAIL_PASS'),
            },
            debug: true, // Enable debug logs
            logger: true, // Log SMTP interactions
          },
          defaults: {
            from: `"No Reply" <${config.get<string>('MAIL_FROM')}>`,
          },
          template: {
            dir: join(__dirname, 'templates'),
            adapter: new HandlebarsAdapter(),
            options: {
              strict: true,
            },
          },
        }),
        inject: [ConfigService],
      }),
    ],
  providers: [EmailService],
  controllers: [EmailController],
  exports: [EmailService],
})
export class EmailModule {}
