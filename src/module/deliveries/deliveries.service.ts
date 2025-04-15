import { ConflictException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Deliveries, DeliveriesDocument } from './schema/deliveries.schema';
import { Model } from 'mongoose';
import { DeliveryDto } from './dto/delivery.dto';
import { User } from '../user/schema/user.schema';

@Injectable()
export class DeliveriesService {
    private readonly logger = new Logger(DeliveriesService.name);
    constructor(@InjectModel(Deliveries.name) private readonly deliveriesModel: Model<DeliveriesDocument>
    ) { }

    async createDeliveries(dto: DeliveryDto, user: User): Promise<{ succes: boolean; data: Deliveries; message: string }> {
        try {
            this.logger.log('Creating new deliveries...');
            const existingDeliveries = await this.deliveriesModel.findOne({ email: dto.email });
            if (existingDeliveries) {
                throw new ConflictException("Customer with this email already exist");
            }
            const newDeliveries = new this.deliveriesModel({
                ...dto,
                 user: user._id, 
                 extraDetails: dto.extraDetails || '',
                  extraPhone: dto.extraPhone || ''
            });
            const savedDeliveries = newDeliveries.save();
            const fullDeliveriessDetails = await this.deliveriesModel.findById((await savedDeliveries)._id).lean().exec();
            return {
                succes: true,
                data: fullDeliveriessDetails,
                message: "Deliveries created Successfully."
            }

        } catch (e) {
            throw e;
        }
    }

    async findAllDeliveries(user: User): Promise<Deliveries[]> {
        try {
            this.logger.log('Fetching all expenses...');
            const deliveries = await this.deliveriesModel.find({ user: user._id }).exec();
            this.logger.log('Expenses fetched successfully.');
            return deliveries;
        } catch (error) {
            this.logger.error('Failed to fetch expenses:', error);
            throw new InternalServerErrorException('Failed to fetch expenses.');
        }
    }

    async findExpenseById(id: string, user: User): Promise<Deliveries> {
        try {
            this.logger.log(`Fetching deliveries with ID: ${id}...`);
            const deliveries = await this.deliveriesModel.findOne({ _id: id, user: user._id }).exec();
            if (!deliveries) {
                throw new NotFoundException(`Expense with ID ${id} not found.`);
            }
            this.logger.log(`Expense with ID ${id} fetched successfully.`);
            return deliveries;
        } catch (error) {
            this.logger.error(`Failed to fetch expense with ID: ${id}`, error);
            throw new InternalServerErrorException(`Failed to fetch expense with ID: ${id}`);
        }
    }

    async updateExpense(id: string, updateExpenseDto: DeliveryDto, user: User): Promise<Deliveries> {
        try {
            this.logger.log(`Updating expense with ID: ${id}...`);
            const updatedDelevry = await this.deliveriesModel.findOneAndUpdate(
                { _id: id, user: user._id },
                updateExpenseDto,
                { new: true },
            ).exec();
            if (!updatedDelevry) {
                throw new NotFoundException(`Expense with ID ${id} not found.`);
            }
            this.logger.log(`Expense with ID ${id} updated successfully.`);
            return updatedDelevry;
        } catch (error) {
            this.logger.error(`Failed to update expense with ID: ${id}`, error);
            throw new InternalServerErrorException(`Failed to update expense with ID: ${id}`);
        }
    }

    async deleteDelivery(id: string, user: User): Promise<{ deleted: boolean }> {
        try {
            this.logger.log(`Deleting expense with ID: ${id}...`);
            const result = await this.deliveriesModel.deleteOne({ _id: id, user: user._id }).exec();
            if (result.deletedCount === 0) {
                throw new NotFoundException(`Expense with ID ${id} not found.`);
            }
            this.logger.log(`Expense with ID ${id} deleted successfully.`);
            return { deleted: true };
        } catch (error) {
            this.logger.error(`Failed to delete expense with ID: ${id}`, error);
            throw new InternalServerErrorException(`Failed to delete expense with ID: ${id}`);
        }
    }

}
