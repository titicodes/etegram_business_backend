// import { Body, Controller, Post, Req, UnauthorizedException } from '@nestjs/common';
// import { AuthService } from './auth.service';
// import { Public } from 'src/common/constants/decorators/public.decorator';
// import { ResponseMessage } from 'src/common/constants/decorators/response.decorator';
// import { RESPONSE_CONSTANT } from 'src/common/constants/response.constants';
// import { LoginDto, VerifyEmailDto } from './dto/create-user.dto';
// import { ForgotPasswordDto, ResetPasswordDto } from '../otp/dto/otp.dto';
// import { CreateUserDto } from '../user/dto/create-user.dto';

// @Controller('auth')
// export class AuthController {
//   constructor(private readonly authService: AuthService) { }

//   @Public()
//   @Post('register')
//   @ResponseMessage(RESPONSE_CONSTANT.AUTH.REGISTER_SUCCESS)
//   async register(@Body() payload: CreateUserDto) {
//     return await this.authService.register(payload);
//   }

//   @Public()
//   @Post('login')
//   @ResponseMessage(RESPONSE_CONSTANT.AUTH.LOGIN_SUCCESS)
//   async login(@Body() payload: LoginDto) {
//     return await this.authService.login(payload);
//   }

//   @Public()
//   @Post('verify-email')
//   @ResponseMessage(RESPONSE_CONSTANT.AUTH.EMAIL_VERIFICATION_SUCCESS)
//   async verifyEmail(@Body() payload: VerifyEmailDto) {
//     return await this.authService.verifyEmail(payload);
//   }

//   @Public()
//   @Post('forgot-password')
//   @ResponseMessage(RESPONSE_CONSTANT.AUTH.PASSWORD_RESET_EMAIL_SUCCESS)
//   async sendPasswordResetEmail(@Body() payload: ForgotPasswordDto) {
//     return await this.authService.sendPasswordResetEmail(payload);
//   }

//   @Public()
//   @Post('forgot-password/update')
//   @ResponseMessage(RESPONSE_CONSTANT.AUTH.PASSWORD_RESET_SUCCESS)
//   async resetPassword(@Body() payload: ResetPasswordDto) {
//     return await this.authService.resetPassword(payload);
//   }
//   @Public()
//   @Post('logout')
//   @ResponseMessage(RESPONSE_CONSTANT.AUTH.PASSWORD_RESET_SUCCESS)
//   async logout(@Req() req) {
//     const authHeader = req.headers.authorization;

//     if (!authHeader || !authHeader.startsWith('Bearer ')) {
//       throw new UnauthorizedException('Authorization token missing or malformed');
//     }

//     const token = authHeader.split(' ')[1]; // Extract actual JWT token
//     return await this.authService.logout(token);
//   }

// }


import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { StoreService } from '../store/store.service';
import { LoginDto, VerifyEmailDto } from './dto/create-user.dto';
import { ForgotPasswordDto, ResetPasswordDto } from '../otp/dto/otp.dto';
import { CreateStoreDto } from '../store/dto/create-store.dto';
import { JwtAuthGuard } from './guard/jwtGuard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly storeService: StoreService,
  ) { }

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('verify-email')
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('store') // or '/register' or other route
  createStore(@Body() createStoreDto: CreateStoreDto, @Request() req: any) {
    return this.storeService.create(createStoreDto, req.user._id.toString());
  }

  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.sendPasswordResetEmail(forgotPasswordDto);
  }

  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Request() req) {
    return this.authService.logout(req.headers.authorization.split(' ')[1]);
  }
}