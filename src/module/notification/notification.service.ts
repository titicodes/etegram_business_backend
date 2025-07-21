

// import { Injectable } from '@nestjs/common';
// import { User } from '../user/schema/user.schema'; // Keep if you use User type in other methods
// import { FirebaseService } from 'src/firebase/firebase.service';

// @Injectable()
// export class NotificationService {
//   constructor(private readonly firebaseService: FirebaseService) { }

//   async sendOrderNotification(user: User, order: any) {
//     const title = 'Order Placed Successfully';
//     const body = `Your order (${order._id}) has been placed successfully. Total: ₦${order.totalPriceWithTax}`;

//     await this.firebaseService.sendNotification(user.toString(), title, body);
//   }

//   async sendOrderStatusUpdate(orderId: string, userId: string, status: string) {
//     const title = 'Order Status Update';
//     const body = `Your order (${orderId}) status has changed to ${status}.`;

//     // Assuming userId here is actually the fcmToken, or you resolve it internally if you re-add UserService
//     // For consistency with other methods, it's better to pass fcmToken directly.
//     // If userId means mongo _id, then you'd need to resolve fcmToken from it.
//     await this.firebaseService.sendNotification(userId, title, body);
//   }

//   async notifyLowStock(productName: string, productId: string, adminIds: string[]) {
//     const title = 'Low Stock Alert';
//     const body = `Product "${productName}" (ID: ${productId}) is running low. Please restock.`;

//     for (const adminId of adminIds) {
//       await this.firebaseService.sendNotification(adminId, title, body);
//     }
//   }

//   // Changed parameter from userId to fcmToken for methods that send user-specific notifications
//   async sendTrialStartNotification(fcmToken: string) {
//     const title = 'Welcome to Your Trial Period!';
//     const body = 'Your 10-day trial has started. Enjoy full access to all premium features!';
//     if (!fcmToken) { console.warn('sendTrialStartNotification: No FCM token provided.'); return; }
//     await this.firebaseService.sendNotification(fcmToken, title, body);
//   }

//   async sendTrialReminderNotification(fcmToken: string) {
//     const title = 'Trial Period Ending Soon';
//     const body = 'Your trial period will end in 2 days. Subscribe to premium to continue using all features!';
//     if (!fcmToken) { console.warn('sendTrialReminderNotification: No FCM token provided.'); return; }
//     await this.firebaseService.sendNotification(fcmToken, title, body);
//   }

//   async sendTrialExpirationNotification(fcmToken: string) {
//     const title = 'Trial Period Expired';
//     const body = 'Your 10-day trial has expired. Subscribe to premium to continue using all features!';
//     if (!fcmToken) { console.warn('sendTrialExpirationNotification: No FCM token provided.'); return; }
//     await this.firebaseService.sendNotification(fcmToken, title, body);
//   }

//   async sendPremiumSubscriptionNotification(fcmToken: string, subscriptionType: 'MONTHLY' | 'YEARLY') {
//     const title = 'Premium Subscription Activated';
//     const body = `Your ${subscriptionType.toLowerCase()} premium subscription has been activated!`;
//     if (!fcmToken) { console.warn('sendPremiumSubscriptionNotification: No FCM token provided.'); return; }
//     await this.firebaseService.sendNotification(fcmToken, title, body);
//   }

//   async sendSubscriptionCancellationNotification(fcmToken: string) {
//     const title = 'Subscription Cancelled';
//     const body = 'Your premium subscription has been cancelled.';
//     if (!fcmToken) { console.warn('sendSubscriptionCancellationNotification: No FCM token provided.'); return; }
//     await this.firebaseService.sendNotification(fcmToken, title, body);
//   }
// }

import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../user/schema/user.schema';
import { UserService } from '../user/user.service';
import { FirebaseService } from 'src/firebase/firebase.service';
import { Notification, NotificationDocument, NotificationType } from './schema/notification.schem';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly firebaseService: FirebaseService,
    private readonly userService: UserService,
  ) { }

  async sendOrderNotification(userId: string, order: any) {
    const user = await this.userService.findById(userId);
    if (!user.fcmToken) {
      this.logger.warn(`User ${userId} has no FCM token. Skipping order notification.`);
      return;
    }

    const title = 'Order Placed Successfully';
    const body = `Your order (${order._id}) has been placed successfully. Total: ₦${order.totalPriceWithTax}`;

    await this.sendAndSaveNotification(userId, title, body, NotificationType.ORDER, { orderId: order._id });
  }

  async sendOrderStatusUpdate(orderId: string, userId: string, status: string) {
    const user = await this.userService.findById(userId);
    if (!user.fcmToken) {
      this.logger.warn(`User ${userId} has no FCM token. Skipping order status notification.`);
      return;
    }

    const title = 'Order Status Update';
    const body = `Your order (${orderId}) status has changed to ${status}.`;

    await this.sendAndSaveNotification(userId, title, body, NotificationType.ORDER, { orderId, status });
  }

  async notifyLowStock(productName: string, productId: string, adminIds: string[]) {
    const title = 'Low Stock Alert';
    const body = `Product "${productName}" (ID: ${productId}) is running low. Please restock.`;

    for (const adminId of adminIds) {
      const user = await this.userService.findById(adminId);
      if (!user.fcmToken) {
        this.logger.warn(`User ${adminId} has no FCM token. Skipping low stock notification.`);
        continue;
      }
      await this.sendAndSaveNotification(adminId, title, body, NotificationType.LOW_STOCK, { productId });
    }
  }

  async sendTrialStartNotification(fcmToken: string) {
    const title = 'Welcome to Your Trial Period!';
    const body = 'Your 10-day trial has started. Enjoy full access to all premium features!';
    if (!fcmToken) {
      this.logger.warn('sendTrialStartNotification: No FCM token provided.');
      return;
    }
    await this.sendAndSaveNotification(null, title, body, NotificationType.SUBSCRIPTION, {}, fcmToken);
  }

  async sendTrialReminderNotification(fcmToken: string) {
    const title = 'Trial Period Ending Soon';
    const body = 'Your trial period will end in 2 days. Subscribe to premium to continue using all features!';
    if (!fcmToken) {
      this.logger.warn('sendTrialReminderNotification: No FCM token provided.');
      return;
    }
    await this.sendAndSaveNotification(null, title, body, NotificationType.SUBSCRIPTION, {}, fcmToken);
  }

  async sendTrialExpirationNotification(fcmToken: string) {
    const title = 'Trial Period Expired';
    const body = 'Your 10-day trial has expired. Subscribe to premium to continue using all features!';
    if (!fcmToken) {
      this.logger.warn('sendTrialExpirationNotification: No FCM token provided.');
      return;
    }
    await this.sendAndSaveNotification(null, title, body, NotificationType.SUBSCRIPTION, {}, fcmToken);
  }

  async sendPremiumSubscriptionNotification(fcmToken: string, subscriptionType: 'MONTHLY' | 'YEARLY') {
    const title = 'Premium Subscription Activated';
    const body = `Your ${subscriptionType.toLowerCase()} premium subscription has been activated!`;
    if (!fcmToken) {
      this.logger.warn('sendPremiumSubscriptionNotification: No FCM token provided.');
      return;
    }
    await this.sendAndSaveNotification(null, title, body, NotificationType.SUBSCRIPTION, { subscriptionType }, fcmToken);
  }

  async sendSubscriptionCancellationNotification(fcmToken: string) {
    const title = 'Subscription Cancelled';
    const body = 'Your premium subscription has been cancelled.';
    if (!fcmToken) {
      this.logger.warn('sendSubscriptionCancellationNotification: No FCM token provided.');
      return;
    }
    await this.sendAndSaveNotification(null, title, body, NotificationType.SUBSCRIPTION, {}, fcmToken);
  }

  async sendBroadcastNotification(
    title: string,
    body: string,
    type: NotificationType = NotificationType.PROMOTIONAL,
    role?: string,
    data: Record<string, any> = {},
  ) {
    const query: any = role ? { role: { $in: [role] } } : {};
    const users = await this.userModel.find(query).exec();

    for (const user of users) {
      if (!user.fcmToken) {
        this.logger.warn(`User ${user._id} has no FCM token. Skipping broadcast notification.`);
        continue;
      }
      await this.sendAndSaveNotification(user._id.toString(), title, body, type, data, user.fcmToken);
    }
  }

  private async sendAndSaveNotification(
    userId: string | null,
    title: string,
    body: string,
    type: NotificationType,
    data: Record<string, any>,
    fcmToken?: string,
  ) {
    try {
      if (fcmToken) {
        await this.firebaseService.sendNotification(fcmToken, title, body, data);
        this.logger.log(`Push notification sent to FCM token: ${fcmToken}`);
      }

      if (userId && Types.ObjectId.isValid(userId)) {
        const notification = new this.notificationModel({
          user: userId,
          title,
          body,
          type,
          data,
          isRead: false,
        });
        await notification.save();
        this.logger.log(`Notification saved for user ${userId}: ${title}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send/save notification: ${error.message}`, error.stack);
    }
  }

  async getUserNotifications(userId: string, limit: number = 20, skip: number = 0) {
    if (!Types.ObjectId.isValid(userId)) {
      this.logger.error(`Invalid user ID: ${userId}`);
      throw new BadRequestException('Invalid user ID');
    }

    const notifications = await this.notificationModel
      .find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec();

    return notifications;
  }

  async markNotificationAsRead(notificationId: string) {
    if (!Types.ObjectId.isValid(notificationId)) {
      this.logger.error(`Invalid notification ID: ${notificationId}`);
      throw new BadRequestException('Invalid notification ID');
    }

    const notification = await this.notificationModel
      .findByIdAndUpdate(notificationId, { isRead: true }, { new: true })
      .exec();

    if (!notification) {
      this.logger.error(`Notification not found: ${notificationId}`);
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  async getUnreadNotificationCount(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      this.logger.error(`Invalid user ID: ${userId}`);
      throw new BadRequestException('Invalid user ID');
    }

    return this.notificationModel.countDocuments({ user: userId, isRead: false }).exec();
  }
}