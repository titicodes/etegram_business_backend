import { BadRequestException, Body, Controller, Get, Param, Post, Put, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { CoreController } from 'src/common/constants/core/controller.core';
import { UserService } from './user.service';
import { RESPONSE_CONSTANT } from 'src/common/constants/response.constants';
import { ResponseMessage } from 'src/common/constants/decorators/response.decorator';
import { JwtAuthGuard } from '../auth/guard/jwtGuard';
import { LoggedInUserDecorator, ILoggedInUser } from 'src/common/constants/decorators/logged_in_user.decorator';
import { changePinDto, pinDto } from './dto/change-pin.dto';
import { FileInterceptor } from '@nestjs/platform-express';


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

    @Post('profile-image')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(FileInterceptor('file'))
    async uploadProfileImage(@Req() req, @UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }
        return this.userService.uploadProfileImage(req.user._id, file);
    }

    @Post(':id/fcm-token')
    async updateUserFcmToken(@Param('id') userId: string, @Body('fcmToken') fcmToken: string) {
        return this.userService.updateUserFcmToken(userId, fcmToken);
    }

    @Put('update-pin/:id')
    async updatePin(
        @Param('id') id: string,
        @Body() pinDto: pinDto,
        @Req() req
    ) {
        console.log("Update Pin ID:", id); // Add this line
        const user = req.user;
        return this.userService.updatePin(id, pinDto);
    }

    @Put('change-pin/:id')
    async changePin(
        @Param('id') id: string,
        @Body() changePinDto: changePinDto,
        @Req() req
    ) {
        console.log("Change Pin ID:", id); // Add this line
        const user = req.user;
        return this.userService.changePin(id, changePinDto);
    }

}
