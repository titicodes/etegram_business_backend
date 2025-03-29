import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { CoreController } from 'src/common/constants/core/controller.core';
import { UserService } from './user.service';
import { RESPONSE_CONSTANT } from 'src/common/constants/response.constants';
import { ResponseMessage } from 'src/common/constants/decorators/response.decorator';
import { JwtAuthGuard } from '../auth/guard/jwtGuard';

@Controller('user')
export class UserController extends CoreController {
    constructor(private readonly userService: UserService) {
        super();
    }

    @UseGuards(JwtAuthGuard)
    @ResponseMessage(RESPONSE_CONSTANT.USER.GET_CURRENT_USER_SUCCESS)
    @Get() // ✅ Changed from @Get('user') to @Get()
    async getProfile(@Req() request) {
        const { user, accessToken } = await this.userService.getUser(request);
        return {
            success: true,
            data: {
                ...user,
                accessToken, // ✅ Now it includes the token
            },
            message: RESPONSE_CONSTANT.USER.GET_CURRENT_USER_SUCCESS,
        };
    }

    @Post(':id/fcm-token')
    async updateUserFcmToken(@Param('id') userId: string, @Body('fcmToken') fcmToken: string) {
        return this.userService.updateUserFcmToken(userId, fcmToken);
    }
}
