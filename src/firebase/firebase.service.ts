import * as admin from 'firebase-admin';
import { Injectable } from '@nestjs/common';
import * as fs from 'fs';

@Injectable()
export class FirebaseService {
  constructor() {
    if (!admin.apps.length) {
      // Load the service account JSON from the file path in .env
      const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT;
      if (!serviceAccountPath) {
        throw new Error('❌ Missing FIREBASE_SERVICE_ACCOUNT in .env file');
      }

      const serviceAccount = JSON.parse(
        fs.readFileSync(serviceAccountPath, 'utf8'),
      );

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });

      console.log('✅ Firebase initialized successfully');
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
      console.log(`✅ Firebase: Updated stock for ${product.code}`);
    } catch (error) {
      console.error(
        `❌ Firebase Error: Failed to update stock for ${product.code}`,
        error,
      );
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
      console.log(`✅ Firebase: Tracked order ${orderId} as ${status}`);
    } catch (error) {
      console.error(
        `❌ Firebase Error: Failed to track order ${orderId}`,
        error,
      );
    }
  }

  async sendPushNotification(deviceToken: string, title: string, body: string) {
    const messaging = this.getMessaging();
    try {
      await messaging.send({
        token: deviceToken,
        notification: { title, body },
      });
      console.log(`✅ Firebase: Push notification sent to ${deviceToken}`);
    } catch (error) {
      console.error(`❌ Firebase Error: Failed to send notification`, error);
    }
  }

  async sendNotification(userId: string, title: string, body: string) {
    const messaging = this.getMessaging();

    try {
      // Get the user's FCM token from Firestore (Assume tokens are stored under `users/{userId}/token`)
      const userRef = this.getFirestore().collection('users').doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists || !userDoc.data()?.fcmToken) {
        console.warn(`⚠️ No FCM token found for user ${userId}`);
        return;
      }

      const deviceToken = userDoc.data().fcmToken;

      await messaging.send({
        token: deviceToken,
        notification: { title, body },
      });

      console.log(`✅ Notification sent to ${userId}: ${title}`);
    } catch (error) {
      console.error(`❌ Firebase Error: Failed to send notification`, error);
    }
  }
}

