// import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
// import { InjectModel } from '@nestjs/mongoose';
// import { Model, Types } from 'mongoose';
// import { User, UserDocument } from '../user/schema/user.schema';
// import { Subscription, SubscriptionDocument } from './schema/subscription.schema';
// import { Cron, CronExpression } from '@nestjs/schedule';
// import { NotificationService } from '../notification/notification.service';
// import { UserService } from '../user/user.service';

// @Injectable()
// export class SubscriptionService {
//     constructor(
//         @InjectModel(Subscription.name) private subscriptionModel: Model<SubscriptionDocument>,
//         @InjectModel(User.name) private userModel: Model<UserDocument>,
//         private readonly notificationService: NotificationService,
//         private readonly userService: UserService,

//     ) { }

//     async createSubscription(userId: string): Promise<SubscriptionDocument> {
//         if (!Types.ObjectId.isValid(userId)) {
//             throw new BadRequestException('Invalid user ID');
//         }

//         const user = await this.userModel.findById(userId).exec(); // You already fetch the user here
//         if (!user) {
//             throw new NotFoundException('User not found');
//         }

//         const trialEndDate = new Date();
//         trialEndDate.setDate(trialEndDate.getDate() + 10);

//         const subscription = new this.subscriptionModel({
//             user: userId,
//             status: 'TRIAL',
//             trialStartDate: new Date(),
//             trialEndDate,
//             subscriptionType: 'NONE',
//             isActive: true,
//         });

//         await subscription.save();

//         // 🎯 Change: Pass the user's FCM token to NotificationService
//         if (user.fcmToken) {
//             await this.notificationService.sendTrialStartNotification(user.fcmToken);
//         } else {
//             console.warn(`User ${userId} has no FCM token. Skipping trial start notification.`);
//         }

//         return subscription;
//     }

//     async subscribeToPremium(userId: string, subscriptionType: 'MONTHLY' | 'YEARLY'): Promise<SubscriptionDocument> {
//         if (!Types.ObjectId.isValid(userId)) {
//             throw new BadRequestException('Invalid user ID');
//         }

//         const subscription = await this.subscriptionModel.findOne({ user: userId }).exec();
//         if (!subscription) {
//             throw new NotFoundException('Subscription not found');
//         }

//         // 🎯 Change: Fetch user to get FCM token for premium notification
//         const user = await this.userModel.findById(userId).exec();
//         if (!user || !user.fcmToken) {
//             console.warn(`User ${userId} has no FCM token. Skipping premium subscription notification.`);
//         } else {
//             await this.notificationService.sendPremiumSubscriptionNotification(user.fcmToken, subscriptionType);
//         }

//         const currentDate = new Date();
//         const endDate = new Date();
//         endDate.setDate(currentDate.getDate() + (subscriptionType === 'MONTHLY' ? 30 : 365));

//         subscription.status = 'PREMIUM';
//         subscription.subscriptionType = subscriptionType;
//         subscription.startDate = currentDate;
//         subscription.endDate = endDate;
//         subscription.isActive = true;

//         await subscription.save();

//         return subscription;
//     }

//     async getSubscriptionStatus(userId: string): Promise<SubscriptionDocument> {
//         if (!Types.ObjectId.isValid(userId)) {
//             throw new BadRequestException('Invalid user ID');
//         }

//         const subscription = await this.subscriptionModel.findOne({ user: userId }).exec();
//         if (!subscription) {
//             throw new NotFoundException('Subscription not found');
//         }

//         return subscription;
//     }


//     @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
//     async checkTrialExpirations(): Promise<void> {
//         const currentDate = new Date();

//         const subscriptions = await this.subscriptionModel
//             .find({
//                 status: 'TRIAL',
//                 trialEndDate: { $lte: currentDate },
//                 isActive: true,
//             })
//             .populate('user') // This populates the 'user' field
//             .exec();

//         for (const subscription of subscriptions) {
//             subscription.status = 'EXPIRED';
//             subscription.isActive = false;
//             await subscription.save();

//             // 🎯 Change: Pass the populated user's FCM token
//             const userId = subscription.user._id.toString(); // Already have userId
//             const fcmToken = (subscription.user as UserDocument).fcmToken; // Access fcmToken from populated user
//             if (fcmToken) {
//                 await this.notificationService.sendTrialExpirationNotification(fcmToken);
//             } else {
//                 console.warn(`User ${userId} has no FCM token. Skipping trial expiration notification.`);
//             }
//         }
//     }

//     @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
//     async sendTrialReminder(): Promise<void> {
//         const currentDate = new Date();
//         const reminderDate = new Date();
//         reminderDate.setDate(currentDate.getDate() + 2);

//         const subscriptions = await this.subscriptionModel
//             .find({
//                 status: 'TRIAL',
//                 trialEndDate: {
//                     $gte: currentDate,
//                     $lte: reminderDate,
//                 },
//                 isActive: true,
//             })
//             .populate('user') // This populates the 'user' field
//             .exec();

//         for (const subscription of subscriptions) {
//             // 🎯 Change: Pass the populated user's FCM token
//             const userId = subscription.user._id.toString(); // Already have userId
//             const fcmToken = (subscription.user as UserDocument).fcmToken; // Access fcmToken from populated user
//             if (fcmToken) {
//                 await this.notificationService.sendTrialReminderNotification(fcmToken);
//             } else {
//                 console.warn(`User ${userId} has no FCM token. Skipping trial reminder notification.`);
//             }
//         }
//     }


//     async cancelSubscription(userId: string): Promise<SubscriptionDocument> {
//         if (!Types.ObjectId.isValid(userId)) {
//             throw new BadRequestException('Invalid user ID');
//         }

//         const subscription = await this.subscriptionModel.findOne({ user: userId }).exec();
//         if (!subscription) {
//             throw new NotFoundException('Subscription not found');
//         }

//         // 🎯 Change: Fetch user to get FCM token for cancellation notification
//         const user = await this.userModel.findById(userId).exec();
//         if (!user || !user.fcmToken) {
//             console.warn(`User ${userId} has no FCM token. Skipping subscription cancellation notification.`);
//         } else {
//             await this.notificationService.sendSubscriptionCancellationNotification(user.fcmToken);
//         }

//         subscription.status = 'CANCELLED';
//         subscription.isActive = false;
//         await subscription.save();

//         return subscription;
//     }
// }

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../user/schema/user.schema';
import { Subscription, SubscriptionDocument } from './schema/subscription.schema';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationService } from '../notification/notification.service';
import { UserService } from '../user/user.service'; // <-- Keep this import as SubscriptionService needs UserService to find users and their FCM tokens

@Injectable()
export class SubscriptionService {
    constructor(
        @InjectModel(Subscription.name) private subscriptionModel: Model<SubscriptionDocument>,
        @InjectModel(User.name) private userModel: Model<UserDocument>, // This model is used for populate, but UserService is for finding a user directly
        private readonly notificationService: NotificationService,
        private readonly userService: UserService, // <-- Keep this injection here, as it's safe now due to UserService's OnModuleInit approach
    ) { }

    async createSubscription(userId: string): Promise<SubscriptionDocument> {
        if (!Types.ObjectId.isValid(userId)) {
            throw new BadRequestException('Invalid user ID');
        }

        const user = await this.userModel.findById(userId).exec(); // You already fetch the user here
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 10);

        const subscription = new this.subscriptionModel({
            user: userId,
            status: 'TRIAL',
            trialStartDate: new Date(),
            trialEndDate,
            subscriptionType: 'NONE',
            isActive: true,
        });

        await subscription.save();

        // Pass the user's FCM token to NotificationService
        if (user.fcmToken) {
            await this.notificationService.sendTrialStartNotification(user.fcmToken);
        } else {
            console.warn(`User ${userId} has no FCM token. Skipping trial start notification.`);
        }

        return subscription;
    }

    async subscribeToPremium(userId: string, subscriptionType: 'MONTHLY' | 'YEARLY'): Promise<SubscriptionDocument> {
        if (!Types.ObjectId.isValid(userId)) {
            throw new BadRequestException('Invalid user ID');
        }

        const subscription = await this.subscriptionModel.findOne({ user: userId }).exec();
        if (!subscription) {
            throw new NotFoundException('Subscription not found');
        }

        // Fetch user to get FCM token for premium notification
        const user = await this.userModel.findById(userId).exec();
        if (!user || !user.fcmToken) {
            console.warn(`User ${userId} has no FCM token. Skipping premium subscription notification.`);
        } else {
            await this.notificationService.sendPremiumSubscriptionNotification(user.fcmToken, subscriptionType);
        }

        const currentDate = new Date();
        const endDate = new Date();
        endDate.setDate(currentDate.getDate() + (subscriptionType === 'MONTHLY' ? 30 : 365));

        subscription.status = 'PREMIUM';
        subscription.subscriptionType = subscriptionType;
        subscription.startDate = currentDate;
        subscription.endDate = endDate;
        subscription.isActive = true;

        await subscription.save();

        return subscription;
    }

    async getSubscriptionStatus(userId: string): Promise<SubscriptionDocument> {
        if (!Types.ObjectId.isValid(userId)) {
            throw new BadRequestException('Invalid user ID');
        }

        const subscription = await this.subscriptionModel.findOne({ user: userId }).exec();
        if (!subscription) {
            throw new NotFoundException('Subscription not found');
        }

        return subscription;
    }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async checkTrialExpirations(): Promise<void> {
        const currentDate = new Date();

        const subscriptions = await this.subscriptionModel
            .find({
                status: 'TRIAL',
                trialEndDate: { $lte: currentDate },
                isActive: true,
            })
            .populate('user')
            .exec();

        for (const subscription of subscriptions) {
            subscription.status = 'EXPIRED';
            subscription.isActive = false;
            await subscription.save();

            const userId = subscription.user._id.toString();
            const fcmToken = (subscription.user as UserDocument).fcmToken;
            if (fcmToken) {
                await this.notificationService.sendTrialExpirationNotification(fcmToken);
            } else {
                console.warn(`User ${userId} has no FCM token. Skipping trial expiration notification.`);
            }
        }
    }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async sendTrialReminder(): Promise<void> {
        const currentDate = new Date();
        const reminderDate = new Date();
        reminderDate.setDate(currentDate.getDate() + 2);

        const subscriptions = await this.subscriptionModel
            .find({
                status: 'TRIAL',
                trialEndDate: {
                    $gte: currentDate,
                    $lte: reminderDate,
                },
                isActive: true,
            })
            .populate('user')
            .exec();

        for (const subscription of subscriptions) {
            const userId = subscription.user._id.toString();
            const fcmToken = (subscription.user as UserDocument).fcmToken;
            if (fcmToken) {
                await this.notificationService.sendTrialReminderNotification(fcmToken);
            } else {
                console.warn(`User ${userId} has no FCM token. Skipping trial reminder notification.`);
            }
        }
    }

    async cancelSubscription(userId: string): Promise<SubscriptionDocument> {
        if (!Types.ObjectId.isValid(userId)) {
            throw new BadRequestException('Invalid user ID');
        }

        const subscription = await this.subscriptionModel.findOne({ user: userId }).exec();
        if (!subscription) {
            throw new NotFoundException('Subscription not found');
        }

        // Fetch user to get FCM token for cancellation notification
        const user = await this.userModel.findById(userId).exec();
        if (!user || !user.fcmToken) {
            console.warn(`User ${userId} has no FCM token. Skipping subscription cancellation notification.`);
        } else {
            await this.notificationService.sendSubscriptionCancellationNotification(user.fcmToken);
        }

        subscription.status = 'CANCELLED';
        subscription.isActive = false;
        await subscription.save();

        return subscription;
    }
}