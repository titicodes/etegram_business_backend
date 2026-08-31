// import { Injectable } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import { Response } from 'express';
// import { authenticator } from 'otplib';
// import { toFileStream } from 'qrcode';
// import { User } from 'src/module/user/schema/user.schema';
// import { UserService } from 'src/module/user/user.service';

// @Injectable()
// export class TwoFactorAuthenticationService {
//   constructor(
//     private readonly _customerService: UserService,
//     private readonly _configService: ConfigService
//   ) { }

//   public async generateTwoFactorAuthenticationSecret(user: User) {
//     const secret = authenticator.generateSecret();
//     const otpauthUrl = authenticator.keyuri(user.email, this._configService.get('TWO_FACTOR_AUTHENTICATION_APP_NAME'), secret);
//     await this._customerService.setTwoFactorAuthenticationSecret(secret, user._id);
//     return {
//       secret,
//       otpauthUrl
//     }
//   }

//   public async pipeQrCodeStream(stream: Response, otpauthUrl: string) {
//     return toFileStream(stream, otpauthUrl);
//   }

//   public isTwoFactorAuthenticationCodeValid(twoFactorAuthenticationCode: string, user: User) {
//     return authenticator.verify({
//       token: twoFactorAuthenticationCode,
//       secret: user.twoFactorAuthenticationSecret
//     })
//   }
// }
