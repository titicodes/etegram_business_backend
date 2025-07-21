import { Controller, Post, Body, Get, Param, Patch, Query, UseGuards, Req } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { Roles } from 'src/common/constants/decorators/role.decorator';
import { UserRoleEnum } from 'src/common/enums/user.enum';
import { JwtAuthGuard } from '../auth/guard/jwtGuard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { NotificationType } from './schema/notification.schem';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('order')
  async sendOrderNotification(@Body() body: { userId: string; order: any }) {
    await this.notificationService.sendOrderNotification(
      body.userId as any,
      body.order,
    );
    return { message: 'Order notification sent' };
  }

  @Post('order-status')
  async sendOrderStatusUpdate(
    @Body() body: { orderId: string; userId: string; status: string },
  ) {
    await this.notificationService.sendOrderStatusUpdate(
      body.orderId,
      body.userId,
      body.status,
    );
    return { message: 'Order status notification sent' };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoleEnum.ADMIN)
  @Post('broadcast')
  async sendBroadcast(
    @Body() payload: { title: string; body: string; type?: NotificationType; role?: string; data?: Record<string, any> },
  ) {
    const { title, body, type = NotificationType.PROMOTIONAL, role, data = {} } = payload;
    await this.notificationService.sendBroadcastNotification(title, body, type, role, data);
    return { message: 'Broadcast notification sent successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getUserNotifications(
    @Req() req,
    @Query('limit') limit: string = '20',
    @Query('skip') skip: string = '0',
  ) {
    const userId = req.user._id;
    const notifications = await this.notificationService.getUserNotifications(userId, parseInt(limit), parseInt(skip));
    return { notifications };
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/read')
  async markAsRead(@Param('id') notificationId: string) {
    const notification = await this.notificationService.markNotificationAsRead(notificationId);
    return { notification };
  }

  @UseGuards(JwtAuthGuard)
  @Get('unread-count')
  async getUnreadCount(@Req() req) {
    const userId = req.user._id;
    const count = await this.notificationService.getUnreadNotificationCount(userId);
    return { unreadCount: count };
  }
}
