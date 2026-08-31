import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Request,
  UseGuards,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import {
  ApiTags,
  ApiBearerAuth,
  ApiResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { Subscription } from './schema/subscription.schema';
import { JwtAuthGuard } from '../auth/guard/jwtGuard';

@ApiTags('subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({ summary: 'Create a new subscription (trial period)' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Subscription created successfully',
    type: Subscription,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid user ID',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  async createSubscription(@Request() req: any): Promise<Subscription> {
    return await this.subscriptionService.createSubscription(req.user._id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('premium/:type')
  @ApiOperation({ summary: 'Subscribe to premium plan (MONTHLY or YEARLY)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Premium subscription activated',
    type: Subscription,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid user ID or subscription type',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Subscription not found',
  })
  async subscribeToPremium(
    @Request() req: any,
    @Param('type') type: 'MONTHLY' | 'YEARLY',
  ): Promise<Subscription> {
    if (!['MONTHLY', 'YEARLY'].includes(type)) {
      throw new BadRequestException('Invalid subscription type');
    }
    return await this.subscriptionService.subscribeToPremium(
      req.user._id,
      type,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Get subscription status' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Subscription status retrieved',
    type: Subscription,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid user ID',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Subscription not found',
  })
  async getSubscriptionStatus(@Request() req: any): Promise<Subscription> {
    return await this.subscriptionService.getSubscriptionStatus(req.user._id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete()
  @ApiOperation({ summary: 'Cancel subscription' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Subscription cancelled',
    type: Subscription,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid user ID',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Subscription not found',
  })
  async cancelSubscription(@Request() req: any): Promise<Subscription> {
    return await this.subscriptionService.cancelSubscription(req.user._id);
  }
}
