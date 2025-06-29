import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../user/schema/user.schema';
import { Subscription, SubscriptionDocument } from './schema/subscription.schema';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class SubscriptionService {
    constructor(
        @InjectModel(Subscription.name) private subscriptionModel: Model<SubscriptionDocument>,
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        private readonly notificationService: NotificationService,
    ) { }

    async createSubscription(userId: string): Promise<SubscriptionDocument> {
        if (!Types.ObjectId.isValid(userId)) {
            throw new BadRequestException('Invalid user ID');
        }

        const user = await this.userModel.findById(userId).exec();
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

        await this.notificationService.sendTrialStartNotification(userId);

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

        const currentDate = new Date();
        const endDate = new Date();
        endDate.setDate(currentDate.getDate() + (subscriptionType === 'MONTHLY' ? 30 : 365));

        subscription.status = 'PREMIUM';
        subscription.subscriptionType = subscriptionType;
        subscription.startDate = currentDate;
        subscription.endDate = endDate;
        subscription.isActive = true;

        await subscription.save();

        await this.notificationService.sendPremiumSubscriptionNotification(userId, subscriptionType);

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

            await this.notificationService.sendTrialExpirationNotification(subscription.user._id.toString());
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
            await this.notificationService.sendTrialReminderNotification(subscription.user._id.toString());
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

        subscription.status = 'CANCELLED';
        subscription.isActive = false;
        await subscription.save();

        await this.notificationService.sendSubscriptionCancellationNotification(userId);

        return subscription;
    }
}