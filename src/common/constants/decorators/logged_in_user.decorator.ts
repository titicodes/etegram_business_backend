import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { UserRoleEnum } from 'src/common/enums/user.enum';

export interface ILoggedInUser {
  _id: string;
  email: string;
  role: UserRoleEnum;
}

// export const LoggedInUserDecorator = createParamDecorator(
//   (_: unknown, ctx: ExecutionContext) => {
//     const request = ctx.switchToHttp().getRequest();
//     return request.user;
//   },
// );

export const LoggedInUserDecorator = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): ILoggedInUser => {
    const request = ctx.switchToHttp().getRequest();
    if (!request.user) {
      throw new Error('Invalid user object');
    }
    return request.user;
  },
);
