import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from 'src/common/constants/decorators/public.decorator';


@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }
}

// import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
// import { JwtService } from '@nestjs/jwt';
// import { UserService } from 'src/module/user/user.service';

// @Injectable()
// export class JwtAuthGuard implements CanActivate {
//     constructor(private readonly jwtService: JwtService, private readonly userService: UserService) {}

//     async canActivate(context: ExecutionContext): Promise<boolean> {
//         const request = context.switchToHttp().getRequest();
//         const token = request.headers.authorization?.split(' ')
//         if (!token) return false;

//         try {
//             const decoded = this.jwtService.verify(token);
//             const user = await this.userService.findById(decoded.id);
//             request.user = user; // Attach user to request
//             return !!user; // Return true if user exists
//         } catch (error) {
//             return false; // Token is invalid
//         }
//     }
// }