// payment-method/payment-method.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../user/schema/user.schema';
import { CreatePaymentMethodDto, UpdatePaymentMethodDto } from './dto/payment-method.dto';
import { PaymentMethod, PaymentMethodDocument } from './schema/payment-method.schema';

@Injectable()
export class PaymentMethodService {
    constructor(
        @InjectModel(PaymentMethod.name) private paymentMethodModel: Model<PaymentMethodDocument>,
    ) { }

    async create(createPaymentMethodDto: CreatePaymentMethodDto, user: User): Promise<PaymentMethod> {
        const createdPaymentMethod = new this.paymentMethodModel({ ...createPaymentMethodDto, user });
        return createdPaymentMethod.save();
    }

    async findAll(user: User): Promise<PaymentMethod[]> {
        return this.paymentMethodModel.find({ user }).exec();
    }

    async findOne(id: string): Promise<PaymentMethod> {
        const paymentMethod = await this.paymentMethodModel.findById(id).exec();
        if (!paymentMethod) {
            throw new NotFoundException(`Payment method with ID ${id} not found`);
        }
        return paymentMethod;
    }

    async update(id: string, updatePaymentMethodDto: UpdatePaymentMethodDto): Promise<PaymentMethod> {
        const updatedPaymentMethod = await this.paymentMethodModel.findByIdAndUpdate(
            id,
            updatePaymentMethodDto,
            { new: true },
        ).exec();
        if (!updatedPaymentMethod) {
            throw new NotFoundException(`Payment method with ID ${id} not found`);
        }
        return updatedPaymentMethod;
    }

    async remove(id: string): Promise<void> {
        const result = await this.paymentMethodModel.findByIdAndDelete(id).exec();
        if (!result) {
            throw new NotFoundException(`Payment method with ID ${id} not found`);
        }
    }
}