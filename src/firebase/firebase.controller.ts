import { Controller, Post, Body } from '@nestjs/common';
import { FirebaseService } from './firebase.service';

@Controller('firebase')
export class FirebaseController {
  constructor(private readonly firebaseService: FirebaseService) { }

  @Post('update-stock')
  async updateStock(@Body() body: { code: string; stock: number }) {
    return await this.firebaseService.updateProductStock(body);
  }

  @Post('track-order')
  async trackOrder(@Body() body: { orderId: string; status: string }) {
    return await this.firebaseService.trackOrderStatus(body.orderId, body.status);
  }

  @Post('send-notification')
  async sendNotification(
    @Body() body: { deviceToken: string; title: string; body: string; data?: Record<string, any> },
  ) {
    return await this.firebaseService.sendNotification(
      body.deviceToken,
      body.title,
      body.body,
      body.data || {},
    );
  }
}