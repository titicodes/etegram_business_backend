// import { Module } from '@nestjs/common';
// import { MailService } from './mail.service';
// import { MailController } from './mail.controller';
// import { MailerModule } from '@nestjs-modules/mailer';
// import { ENVIRONMENT } from 'src/common/configs/environment';
// import { join } from 'path';
// @Module({
//   imports: [
//     MailerModule.forRoot({
//       transport: {
//         service: 'gmail',
//         auth: {
//           user: ENVIRONMENT.MAILER.EMAIL,
//           pass: ENVIRONMENT.MAILER.PASSWORD,
//         },
//       },
//       defaults: {
//         from: '"No Reply" <noreply>@macwin.com>',
//       },
//       template: {
//         dir: join(__dirname, 'templates'),
//         options: {
//           strict: true,
//         },
//       },
//     }),
//   ],
//   controllers: [MailController],
//   providers: [MailService],
//   exports: [MailService],
// })
// export class MailModule {}

import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { join } from 'path';
import { MailService } from './mail.service';
import { MailController } from './mail.controller';
import { ENVIRONMENT } from 'src/common/config/environment';
import { debug } from 'console';
import { logger } from 'env-var';

@Module({
  imports: [
    MailerModule.forRoot({
      transport: {
        host: ENVIRONMENT.MAILER.HOST,
        port: +ENVIRONMENT.MAILER.PORT,
        auth: {
          user: ENVIRONMENT.MAILER.EMAIL,
          pass: ENVIRONMENT.MAILER.PASSWORD,
        },
        debug:true,
        logger:true
      },
      defaults: {
        from: '"No Reply" <noreply@macwin.com>',
      },
      template: {
        dir: join(__dirname, 'templates'),
        options: {
          strict: true,
        },
      },
    }),
  ],
  controllers: [MailController],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
