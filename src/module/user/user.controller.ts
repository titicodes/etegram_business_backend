import { BadRequestException, Body, Controller, Get, Param, Post, Put, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { CoreController } from 'src/common/constants/core/controller.core';
import { UserService } from './user.service';
import { RESPONSE_CONSTANT } from 'src/common/constants/response.constants';
import { ResponseMessage } from 'src/common/constants/decorators/response.decorator';
import { JwtAuthGuard } from '../auth/guard/jwtGuard';
import { LoggedInUserDecorator, ILoggedInUser } from 'src/common/constants/decorators/logged_in_user.decorator';
import { changePinDto, pinDto } from './dto/change-pin.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';


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

    @Post(':userId/profile-image')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/profile-images',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const fileExt = extname(file.originalname).toLowerCase();
        cb(null, `${file.fieldname}-${uniqueSuffix}${fileExt}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/bmp',
      ];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new BadRequestException(`Unsupported file type. Only JPEG, PNG, GIF, WebP, or BMP allowed`), false);
      }
    },
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
  }))
  async uploadProfileImage(@Param('userId') userId: string, @UploadedFile() file: Express.Multer.File) {
    return this.userService.uploadProfileImage(userId, file);
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
