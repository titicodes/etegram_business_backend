import { Controller, Post, Body } from '@nestjs/common';
import { NotificationService } from './notification.service';

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
}
