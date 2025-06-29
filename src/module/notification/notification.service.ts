import { Injectable } from '@nestjs/common';
import { User } from '../user/schema/user.schema';
import { FirebaseService } from 'src/firebase/firebase.service';

@Injectable()
export class NotificationService {
  constructor(private readonly firebaseService: FirebaseService) { }

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

  async sendTrialStartNotification(userId: string) {
    const title = 'Welcome to Your Trial Period!';
    const body = 'Your 10-day trial has started. Enjoy full access to all premium features!';

    await this.firebaseService.sendNotification(userId, title, body);
  }

  async sendTrialReminderNotification(userId: string) {
    const title = 'Trial Period Ending Soon';
    const body = 'Your trial period will end in 2 days. Subscribe to premium to continue using all features!';

    await this.firebaseService.sendNotification(userId, title, body);
  }

  async sendTrialExpirationNotification(userId: string) {
    const title = 'Trial Period Expired';
    const body = 'Your 10-day trial has expired. Subscribe to premium to continue using all features!';

    await this.firebaseService.sendNotification(userId, title, body);
  }

  async sendPremiumSubscriptionNotification(userId: string, subscriptionType: 'MONTHLY' | 'YEARLY') {
    const title = 'Premium Subscription Activated';
    const body = `Your ${subscriptionType.toLowerCase()} premium subscription has been activated!`;

    await this.firebaseService.sendNotification(userId, title, body);
  }

  async sendSubscriptionCancellationNotification(userId: string) {
    const title = 'Subscription Cancelled';
    const body = 'Your premium subscription has been cancelled.';

    await this.firebaseService.sendNotification(userId, title, body);
  }
}