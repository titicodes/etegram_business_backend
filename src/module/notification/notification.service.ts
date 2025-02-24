import { Injectable } from '@nestjs/common';
import { User } from '../user/schema/user.schema';
import { FirebaseService } from 'src/firebase/firebase.service';

@Injectable()
export class NotificationService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async sendOrderNotification(user: User, order: any) {
    const title = 'Order Placed Successfully';
    const body = `Your order (${order._id}) has been placed successfully. Total: ₦${order.totalPriceWithTax}`;
    
    await this.firebaseService.sendNotification(user.toString(), title, body);
  }

  async sendOrderStatusUpdate(orderId: string, userId: string, status: string) {
    const title = 'Order Status Update';
    const body = `Your order (${orderId}) status has changed to ${status}.`;
    
    await this.firebaseService.sendNotification(userId, title, body);
  }

  async notifyLowStock(productName: string, productId: string, adminIds: string[]) {
    const title = 'Low Stock Alert';
    const body = `Product "${productName}" (ID: ${productId}) is running low. Please restock.`;

    for (const adminId of adminIds) {
      await this.firebaseService.sendNotification(adminId, title, body);
    }
  }
}
