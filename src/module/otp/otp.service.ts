// import {
//   Injectable,
//   NotFoundException,
//   InternalServerErrorException,
//   Logger,
// } from '@nestjs/common';
// import { InjectModel } from '@nestjs/mongoose';
// import { Model } from 'mongoose';
// import { OTP, OTPDocument } from './schemas/otp.schema';
// import {
//   CreateOtpDto,
//   ValidateOtpDto,
//   SendOtpDto,
//   VerifyOtpDto,
// } from './dto/otp.dto';
// import * as twilio from 'twilio';

// import { BaseHelper } from 'src/utils/helper.util';
// import { MailService } from '../mail/mail.service';
// import { ForgotPasswordTemplate } from '../mail/templates/forgot-password.email';
// import { VerifyEmailTemplate } from '../mail/templates/verify-email.email';
// import { OtpTypeEnum } from 'src/common/enums/otp.enum';

// @Injectable()
// export class OtpService {
//   private readonly logger = new Logger(OtpService.name);
//   private twilioClient;

//   constructor(
//     @InjectModel(OTP.name) private otpModel: Model<OTPDocument>,
//     private readonly mailService: MailService,
//   ) {
//     this.twilioClient = twilio(
//       process.env.TWILIO_ACCOUNT_SID,
//       process.env.TWILIO_AUTH_TOKEN,
//     );
//   }

//   async createOTP(payload: CreateOtpDto): Promise<OTPDocument> {
//     this.logger.log(`Checking for existing OTP for email: ${payload.email}`);
//     const existingOtp = await this.otpModel.findOne({
//       email: payload.email,
//       type: payload.type,
//     });
//     this.logger.log(`Existing OTP: ${existingOtp ? existingOtp.code : 'None'}`);

//     const otp = await this.otpModel.findOneAndUpdate(
//       { email: payload.email, type: payload.type },
//       payload,
//       { upsert: true, new: true },
//     );

//     this.logger.log(`Created OTP: ${otp.code} for email: ${payload.email}`);
//     return otp;
//   }

//   async validateOTP(payload: ValidateOtpDto) {
//     const { email, code, type } = payload;
//     this.logger.log(
//       `Validating OTP for email: ${email}, code: ${code}, type: ${type}`,
//     );

//     const otp = await this.otpModel.findOne({ email, code, type });
//     this.logger.log(
//       `Query result for email: ${email}, code: ${code}, type: ${type} -> ${otp}`,
//     );

//     if (!otp) {
//       this.logger.warn(`Invalid OTP code for email: ${email}`);
//       throw new NotFoundException('Invalid OTP code');
//     }

//     this.logger.log(`OTP validated successfully for email: ${email}`);
//     return otp;
//   }

//   async sendOTP(payload: SendOtpDto) {
//     const { email, type, phone } = payload;
//     const code = BaseHelper.generateOTP();
//     this.logger.log(
//       `Sending OTP: ${code} to email: ${email} and phone: ${phone}`,
//     );

//     if (type === OtpTypeEnum.REGISTRATION && phone) {
//       const formattedPhone = `+${phone.replace(/\D/g, '')}`;
//       try {
//         await this.twilioClient.messages.create({
//           body: `Your OTP code is: ${code}`,
//           from: process.env.TWILIO_PHONE_NUMBER,
//           to: formattedPhone,
//         });
//         this.logger.log(`OTP sent successfully via SMS to: ${formattedPhone}`);
//       } catch (err) {
//         this.logger.error('Failed to send OTP via SMS', err);
//         throw new InternalServerErrorException('Failed to send OTP via SMS');
//       }
//     } else {
//       let template: string;
//       let subject: string;

//       if (type === OtpTypeEnum.RESET_PASSWORD) {
//         template = ForgotPasswordTemplate({ code });
//         subject = 'Reset Your Password';
//       } else if (type === OtpTypeEnum.VERIFY_EMAIL) {
//         template = VerifyEmailTemplate({ code });
//         subject = 'Verify Your Email';
//       }

//       const otp = await this.createOTP({ email, code, type });
//       if (!otp) {
//         this.logger.error('Unable to send OTP at the moment');
//         throw new InternalServerErrorException(
//           'Unable to send OTP at the moment, try again later',
//         );
//       }

//       await this.mailService.sendEmail(email, subject, template);
//       this.logger.log(`OTP sent successfully via email to: ${email}`);
//     }
//   }

//   async verifyOTP(payload: VerifyOtpDto) {
//     this.logger.log(`Verifying OTP for payload: ${JSON.stringify(payload)}`);
//     const otp = await this.validateOTP(payload);
//     await this.deleteOTP(otp._id.toString());
//     this.logger.log(`OTP verified and deleted for email: ${payload.email}`);
//     return true;
//   }

//   async deleteOTP(id: string) {
//     this.logger.log(`Deleting OTP with ID: ${id}`);
//     return this.otpModel.findByIdAndDelete(id);
//   }
// }

import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OTP, OTPDocument } from './schemas/otp.schema';
import {
  CreateOtpDto,
  ValidateOtpDto,
  SendOtpDto,
  VerifyOtpDto,
} from './dto/otp.dto';
import * as twilio from 'twilio';

import { BaseHelper } from 'src/utils/helper.util';
import { OtpTypeEnum } from 'src/common/enums/otp.enum';
import { EmailService } from '../email/email.service';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly twilioClient;

  constructor(
    @InjectModel(OTP.name) private otpModel: Model<OTPDocument>,
    private readonly mailService: EmailService,
  ) {
    this.twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
    );
  }

  async createOTP(payload: CreateOtpDto): Promise<OTPDocument> {
    const { email, type } = payload;
    this.logger.log(`Generating OTP for email: ${email}`);

    const otp = await this.otpModel.findOneAndUpdate({ email, type }, payload, {
      upsert: true,
      new: true,
    });

    this.logger.log(`Created OTP: ${otp.code} for email: ${email}`);
    return otp;
  }

  async validateOTP(payload: ValidateOtpDto) {
    const { email, code, type } = payload;
    const otp = await this.otpModel.findOne({ email, code, type });

    if (!otp) {
      this.logger.warn(`Invalid OTP for email: ${email}`);
      throw new NotFoundException('Invalid OTP code');
    }

    return otp;
  }

  async sendOTP(payload: SendOtpDto) {
    const { email, type, phone } = payload;
    const code = BaseHelper.generateOTP();
    this.logger.log(`Generated OTP code: ${code} for ${email}`);

    // Save the OTP
    const otp = await this.createOTP({ email, type, code });

    if (!otp) {
      throw new InternalServerErrorException('Unable to generate OTP');
    }

    // Send SMS if REGISTRATION
    if (type === OtpTypeEnum.REGISTRATION && phone) {
      const formattedPhone = `+${phone.replace(/\D/g, '')}`;
      try {
        await this.twilioClient.messages.create({
          body: `Your OTP code is: ${code}`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: formattedPhone,
        });
        this.logger.log(`OTP sent via SMS to: ${formattedPhone}`);
      } catch (err) {
        this.logger.error('Failed to send OTP via SMS', err);
        throw new InternalServerErrorException('Failed to send OTP via SMS');
      }
    } else {
      let subject: string;
      let templateName: string;

      if (type === OtpTypeEnum.RESET_PASSWORD) {
        subject = 'Reset Your Password';
        templateName = 'forgot-password';
      } else if (type === OtpTypeEnum.VERIFY_EMAIL) {
        subject = 'Verify Your Email';
        templateName = 'verify-email';
      } else {
        this.logger.error(`Unsupported OTP type: ${type}`);
        throw new InternalServerErrorException('Unsupported OTP type');
      }

      await this.mailService.sendTemplatedEmail(email, subject, templateName, {
        code,
      });
      this.logger.log(`OTP sent via email to: ${email}`);
    }
  }

  async verifyOTP(payload: VerifyOtpDto) {
    const otp = await this.validateOTP(payload);
    await this.deleteOTP(otp._id.toString());
    this.logger.log(`OTP verified and deleted for ${payload.email}`);
    return true;
  }

  async deleteOTP(id: string) {
    return this.otpModel.findByIdAndDelete(id);
  }
}
