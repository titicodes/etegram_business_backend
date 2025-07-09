// import { Injectable } from '@nestjs/common';
// import { User } from '../user/schema/user.schema';
// import { FirebaseService } from 'src/firebase/firebase.service';
// import { UserService } from '../user/user.service';

// @Injectable()
// export class NotificationService {
//   constructor(private readonly firebaseService: FirebaseService,

//   ) { }

//   async sendOrderNotification(user: User, order: any) {
//     const title = 'Order Placed Successfully';
//     const body = `Your order (${order._id}) has been placed successfully. Total: ₦${order.totalPriceWithTax}`;

//     await this.firebaseService.sendNotification(user.toString(), title, body);
//   }

//   async sendOrderStatusUpdate(orderId: string, userId: string, status: string) {
//     const title = 'Order Status Update';
//     const body = `Your order (${orderId}) status has changed to ${status}.`;

//     await this.firebaseService.sendNotification(userId, title, body);
//   }

//   async notifyLowStock(productName: string, productId: string, adminIds: string[]) {
//     const title = 'Low Stock Alert';
//     const body = `Product "${productName}" (ID: ${productId}) is running low. Please restock.`;

//     for (const adminId of adminIds) {
//       await this.firebaseService.sendNotification(adminId, title, body);
//     }
//   }

//   async sendTrialStartNotification(fcmToken: string) {
//     const title = 'Welcome to Your Trial Period!';
//     const body = 'Your 10-day trial has started. Enjoy full access to all premium features!';

//     if (!fcmToken) {
//       console.warn('sendTrialStartNotification: No FCM token provided.');
//       return;
//     }
//     await this.firebaseService.sendNotification(fcmToken, title, body);
//   }


//   // 🎯 Change parameter from userId to fcmToken
//   async sendTrialReminderNotification(fcmToken: string) {
//     const title = 'Trial Period Ending Soon';
//     const body = 'Your trial period will end in 2 days. Subscribe to premium to continue using all features!';

//     if (!fcmToken) {
//       console.warn('sendTrialReminderNotification: No FCM token provided.');
//       return;
//     }
//     await this.firebaseService.sendNotification(fcmToken, title, body);
//   }

//   // 🎯 Change parameter from userId to fcmToken
//   async sendTrialExpirationNotification(fcmToken: string) {
//     const title = 'Trial Period Expired';
//     const body = 'Your 10-day trial has expired. Subscribe to premium to continue using all features!';

//     if (!fcmToken) {
//       console.warn('sendTrialExpirationNotification: No FCM token provided.');
//       return;
//     }
//     await this.firebaseService.sendNotification(fcmToken, title, body);
//   }


//   // 🎯 Change parameter from userId to fcmToken
//   async sendPremiumSubscriptionNotification(fcmToken: string, subscriptionType: 'MONTHLY' | 'YEARLY') {
//     const title = 'Premium Subscription Activated';
//     const body = `Your ${subscriptionType.toLowerCase()} premium subscription has been activated!`;

//     if (!fcmToken) {
//       console.warn('sendPremiumSubscriptionNotification: No FCM token provided.');
//       return;
//     }
//     await this.firebaseService.sendNotification(fcmToken, title, body);
//   }

//   // 🎯 Change parameter from userId to fcmToken
//   async sendSubscriptionCancellationNotification(fcmToken: string) {
//     const title = 'Subscription Cancelled';
//     const body = 'Your premium subscription has been cancelled.';

//     if (!fcmToken) {
//       console.warn('sendSubscriptionCancellationNotification: No FCM token provided.');
//       return;
//     }
//     await this.firebaseService.sendNotification(fcmToken, title, body);
//   }

// }

import { Injectable } from '@nestjs/common';
import { User } from '../user/schema/user.schema'; // Keep if you use User type in other methods
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

    // Assuming userId here is actually the fcmToken, or you resolve it internally if you re-add UserService
    // For consistency with other methods, it's better to pass fcmToken directly.
    // If userId means mongo _id, then you'd need to resolve fcmToken from it.
    await this.firebaseService.sendNotification(userId, title, body);
  }

  async notifyLowStock(productName: string, productId: string, adminIds: string[]) {
    const title = 'Low Stock Alert';
    const body = `Product "${productName}" (ID: ${productId}) is running low. Please restock.`;

    for (const adminId of adminIds) {
      await this.firebaseService.sendNotification(adminId, title, body);
    }
  }

  // Changed parameter from userId to fcmToken for methods that send user-specific notifications
  async sendTrialStartNotification(fcmToken: string) {
    const title = 'Welcome to Your Trial Period!';
    const body = 'Your 10-day trial has started. Enjoy full access to all premium features!';
    if (!fcmToken) { console.warn('sendTrialStartNotification: No FCM token provided.'); return; }
    await this.firebaseService.sendNotification(fcmToken, title, body);
  }

  async sendTrialReminderNotification(fcmToken: string) {
    const title = 'Trial Period Ending Soon';
    const body = 'Your trial period will end in 2 days. Subscribe to premium to continue using all features!';
    if (!fcmToken) { console.warn('sendTrialReminderNotification: No FCM token provided.'); return; }
    await this.firebaseService.sendNotification(fcmToken, title, body);
  }

  async sendTrialExpirationNotification(fcmToken: string) {
    const title = 'Trial Period Expired';
    const body = 'Your 10-day trial has expired. Subscribe to premium to continue using all features!';
    if (!fcmToken) { console.warn('sendTrialExpirationNotification: No FCM token provided.'); return; }
    await this.firebaseService.sendNotification(fcmToken, title, body);
  }

  async sendPremiumSubscriptionNotification(fcmToken: string, subscriptionType: 'MONTHLY' | 'YEARLY') {
    const title = 'Premium Subscription Activated';
    const body = `Your ${subscriptionType.toLowerCase()} premium subscription has been activated!`;
    if (!fcmToken) { console.warn('sendPremiumSubscriptionNotification: No FCM token provided.'); return; }
    await this.firebaseService.sendNotification(fcmToken, title, body);
  }

  async sendSubscriptionCancellationNotification(fcmToken: string) {
    const title = 'Subscription Cancelled';
    const body = 'Your premium subscription has been cancelled.';
    if (!fcmToken) { console.warn('sendSubscriptionCancellationNotification: No FCM token provided.'); return; }
    await this.firebaseService.sendNotification(fcmToken, title, body);
  }
}