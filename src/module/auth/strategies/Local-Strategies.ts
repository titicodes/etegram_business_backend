
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
// import { AuthenticationService } from './authentication.service';
import { AuthService } from '../auth.service';
import { User } from 'src/module/user/schema/user.schema';


// @Injectable()
// export class LocalStrategy extends PassportStrategy(Strategy) {
//     constructor(private readonly authService: AuthService) {
//         super({
//             usernameField: 'email'
//         });
//     }

//     async validate(payload:CreateUserDto): Promise<Partial<User>> {
//         return this.authService.register(payload);
//     }
// }

// @Injectable()
// export class LocalStrategy extends PassportStrategy(Strategy) {
//   constructor(private authService: AuthService) {
//     super();
//   }

//   async validate(username: string, password: string): Promise<any> {
//     const user = await this.authService._verifyUser(username, password);
//     if (!user) {
//       throw new UnauthorizedException();
//     }
//     return user;
//   }
// }
