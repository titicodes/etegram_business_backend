import { Body, Controller, Post } from '@nestjs/common';
import { OtpService } from './otp.service';
import { RESPONSE_CONSTANT } from 'src/common/constants/response.constants';
import { SendOtpDto, ValidateOtpDto } from './dto/otp.dto';
import { ResponseMessage } from 'src/common/constants/decorators/response.decorator';
import { Public } from 'src/common/constants/decorators/public.decorator';

@Controller('otp')
export class OtpController {
  constructor(private readonly otpService: OtpService) {}

  @Public()
  @ResponseMessage(RESPONSE_CONSTANT.OTP.OTP_SENT)
  @Post('/resend')
  async resendOTP(@Body() payload: SendOtpDto) {
    await this.otpService.sendOTP(payload);
    return { success: true, message: 'OTP resent successfully' };
  }

  @Public()
  @ResponseMessage(RESPONSE_CONSTANT.OTP.OTP_VALID)
  @Post('/verify')
  async verifyOTP(@Body() payload: ValidateOtpDto) {
    await this.otpService.validateOTP(payload);
    return { success: true, message: 'OTP verified successfully' };
  }
}
