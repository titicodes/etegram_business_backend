// import * as admin from 'firebase-admin';
// import { Injectable } from '@nestjs/common';
// import * as fs from 'fs';

// @Injectable()
// export class FirebaseService {
//   constructor() {
//     if (!admin.apps.length) {
//       const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT;
//       if (!serviceAccountPath) {
//         throw new Error('❌ Missing FIREBASE_SERVICE_ACCOUNT in .env file');
//       }

//       const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

//       admin.initializeApp({
//         credential: admin.credential.cert(serviceAccount),
//       });

//       console.log('✅ Firebase initialized successfully');
//     }
//   }

//   getFirestore() {
//     return admin.firestore();
//   }

//   getRealtimeDB() {
//     return admin.database();
//   }

//   getMessaging() {
//     return admin.messaging();
//   }

//   async updateProductStock(product: { code: string; stock: number }) {
//     const db = this.getFirestore();
//     try {
//       await db.collection('products').doc(product.code).set(
//         {
//           stock: product.stock,
//         },
//         { merge: true },
//       );
//       console.log(`✅ Firebase: Updated stock for ${product.code}`);
//     } catch (error) {
//       console.error(
//         `❌ Firebase Error: Failed to update stock for ${product.code}`,
//         error,
//       );
//     }
//   }

//   async trackOrderStatus(orderId: string, status: string) {
//     const db = this.getFirestore();
//     try {
//       await db.collection('orders').doc(orderId).set(
//         {
//           status,
//           updatedAt: admin.firestore.FieldValue.serverTimestamp(),
//         },
//         { merge: true },
//       );
//       console.log(`✅ Firebase: Tracked order ${orderId} as ${status}`);
//     } catch (error) {
//       console.error(
//         `❌ Firebase Error: Failed to track order ${orderId}`,
//         error,
//       );
//     }
//   }

//   async sendPushNotification(deviceToken: string, title: string, body: string) {
//     const messaging = this.getMessaging();
//     try {
//       await messaging.send({
//         token: deviceToken,
//         notification: { title, body },
//       });
//       console.log(`✅ Firebase: Push notification sent to ${deviceToken}`);
//     } catch (error) {
//       console.error(`❌ Firebase Error: Failed to send notification`, error);
//     }
//   }

//   async sendNotification(token: string, title: string, body: string) {
//     if (!token) {
//       console.warn('No FCM token provided');
//       return { success: false, error: 'No FCM token provided' };
//     }

//     const message: admin.messaging.Message = {
//       token,
//       notification: {
//         title,
//         body,
//       },
//       android: {
//         priority: 'high' as 'high',
//       },
//       apns: {
//         payload: {
//           aps: {
//             contentAvailable: true,
//             alert: {
//               title,
//               body,
//             },
//           },
//         },
//       },
//     };

//     try {
//       const response = await admin.messaging().send(message);
//       console.log('✅ Notification sent successfully:', response);
//       return { success: true, response };
//     } catch (error: any) {
//       console.error('❌ Error sending notification:', error);
//       if (error.code === 'messaging/invalid-argument' || error.code === 'messaging/registration-token-not-registered') {
//         // Log the error but don't throw to avoid blocking the registration process
//         return { success: false, error: 'Invalid or unregistered FCM token' };
//       }
//       throw error; // Re-throw other errors
//     }
//   }



// }


import * as admin from 'firebase-admin';
import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';

@Injectable()
export class FirebaseService {
  private readonly logger = new Logger(FirebaseService.name);

  constructor() {
    if (!admin.apps.length) {
      const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT;
      if (!serviceAccountPath) {
        throw new Error('❌ Missing FIREBASE_SERVICE_ACCOUNT in .env file');
      }

      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

      this.logger.log('✅ Firebase initialized successfully');
    }
  }

  getFirestore() {
    return admin.firestore();
  }

  getRealtimeDB() {
    return admin.database();
  }

  getMessaging() {
    return admin.messaging();
  }

  async updateProductStock(product: { code: string; stock: number }) {
    const db = this.getFirestore();
    try {
      await db.collection('products').doc(product.code).set(
        {
          stock: product.stock,
        },
        { merge: true },
      );
      this.logger.log(`✅ Firebase: Updated stock for ${product.code}`);
    } catch (error) {
      this.logger.error(`❌ Firebase Error: Failed to update stock for ${product.code}`, error.stack);
    }
  }

  async trackOrderStatus(orderId: string, status: string) {
    const db = this.getFirestore();
    try {
      await db.collection('orders').doc(orderId).set(
        {
          status,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      this.logger.log(`✅ Firebase: Tracked order ${orderId} as ${status}`);
    } catch (error) {
      this.logger.error(`❌ Firebase Error: Failed to track order ${orderId}`, error.stack);
    }
  }

  async sendNotification(token: string, title: string, body: string, data: Record<string, any> = {}) {
    if (!token) {
      this.logger.warn('No FCM token provided');
      return { success: false, error: 'No FCM token provided' };
    }

    const message: admin.messaging.Message = {
      token,
      notification: {
        title,
        body,
      },
      data: Object.keys(data).reduce((acc, key) => ({ ...acc, [key]: String(data[key]) }), {}),
      android: {
        priority: 'high' as 'high',
      },
      apns: {
        payload: {
          aps: {
            contentAvailable: true,
            alert: {
              title,
              body,
            },
          },
        },
      },
    };

    try {
      const response = await admin.messaging().send(message);
      this.logger.log(`✅ Notification sent successfully to ${token}: ${response}`);
      return { success: true, response };
    } catch (error: any) {
      this.logger.error(`❌ Error sending notification to ${token}: ${error.message}`, error.stack);
      if (error.code === 'messaging/invalid-argument' || error.code === 'messaging/registration-token-not-registered') {
        return { success: false, error: 'Invalid or unregistered FCM token' };
      }
      throw error;
    }
  }
}