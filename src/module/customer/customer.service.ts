import { BadRequestException, ConflictException, Injectable, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Customer, CustomerDocument } from './schema/customer.schema';
import { User, UserDocument } from '../user/schema/user.schema';
import { UserRoleEnum } from '../../common/enums/user.enum';
import { CreateCustomerDto } from './dto/customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomerService {
    private readonly logger = new Logger(CustomerService.name);

    constructor(
        @InjectModel(Customer.name) private readonly customerModel: Model<CustomerDocument>,
    ) { }

    async createCustomer(dto: CreateCustomerDto, user: UserDocument): Promise<{ success: boolean; data: Customer; message: string }> {
        this.logger.log(`Creating customer for user=${user._id}`);

        if (dto.storeId && !Types.ObjectId.isValid(dto.storeId)) {
            throw new BadRequestException('Invalid store ID');
        }

        if (dto.storeId) {
            const store = await this.validateStoreAccess(dto.storeId, user._id.toString(), user.role);
            if (!store) {
                throw new BadRequestException('Store not found or you do not have permission');
            }
        }

        try {
            const existingCustomer = await this.customerModel
                .findOne({ email: dto.email, user: user._id })
                .exec();
            if (existingCustomer) {
                throw new ConflictException(`Customer with email ${dto.email} already exists`);
            }

            const [newCustomer] = await this.customerModel.create([
                {
                    ...dto,
                    user: user._id,
                    store: dto.storeId ? new Types.ObjectId(dto.storeId) : undefined,
                    extraPhone: dto.extraPhone || '',
                    createdAt: new Date(),
                },
            ]);

            const fullCustomer = await this.customerModel.findById(newCustomer._id).lean().exec();
            this.logger.log(`Created customer id=${newCustomer._id}`);
            return {
                success: true,
                data: fullCustomer,
                message: 'Customer created successfully',
            };
        } catch (error) {
            this.logger.error(`Failed to create customer: ${error.message}`, error.stack);
            throw error instanceof ConflictException
                ? error
                : new InternalServerErrorException('Failed to create customer');
        }
    }

    async updateCustomer(id: string, dto: UpdateCustomerDto, user: UserDocument): Promise<Customer> {
        this.logger.log(`Updating customer id=${id} for user=${user._id}`);

        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException('Invalid customer ID');
        }

        const customer = await this.customerModel.findOne({ _id: id, user: user._id }).exec();
        if (!customer) {
            throw new NotFoundException(`Customer with ID ${id} not found`);
        }

        if (dto.storeId && dto.storeId !== customer.store?.toString()) {
            const store = await this.validateStoreAccess(dto.storeId, user._id.toString(), user.role);
            if (!store) {
                throw new BadRequestException('Store not found or you do not have permission');
            }
        }

        try {
            Object.assign(customer, { ...dto, extraPhone: dto.extraPhone || customer.extraPhone, updatedAt: new Date() });
            const updatedCustomer = await customer.save();
            this.logger.log(`Updated customer id=${id}`);
            return updatedCustomer;
        } catch (error) {
            this.logger.error(`Failed to update customer id=${id}: ${error.message}`, error.stack);
            throw new InternalServerErrorException(`Failed to update customer with ID ${id}`);
        }
    }

    async findOne(user: UserDocument, filter: { id?: string; email?: string; storeId?: string }): Promise<Customer | null> {
        this.logger.log(`Finding customer for user=${user._id}, filter=${JSON.stringify(filter)}`);

        if (filter.id && !Types.ObjectId.isValid(filter.id)) {
            throw new BadRequestException('Invalid customer ID');
        }
        if (filter.storeId && !Types.ObjectId.isValid(filter.storeId)) {
            throw new BadRequestException('Invalid store ID');
        }

        const query: any = { user: user._id };
        if (filter.id) query._id = filter.id;
        if (filter.email) query.email = filter.email;
        if (filter.storeId) {
            const store = await this.validateStoreAccess(filter.storeId, user._id.toString(), user.role);
            if (!store) {
                throw new BadRequestException('Store not found or you do not have permission');
            }
            query.store = filter.storeId;
        }

        try {
            const customer = await this.customerModel.findOne(query).exec();
            this.logger.log(customer ? `Found customer id=${customer._id}` : 'No customer found');
            return customer;
        } catch (error) {
            this.logger.error(`Failed to find customer: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Failed to find customer');
        }
    }

    async findAll(user: UserDocument, storeId?: string, keyword?: string): Promise<Customer[]> {
        this.logger.log(`Finding all customers for user=${user._id}, store=${storeId || 'all'}, keyword=${keyword || 'none'}`);

        const query: any = { user: user._id };
        if (storeId) {
            if (!Types.ObjectId.isValid(storeId)) {
                throw new BadRequestException('Invalid store ID');
            }
            const store = await this.validateStoreAccess(storeId, user._id.toString(), user.role);
            if (!store) {
                throw new BadRequestException('Store not found or you do not have permission');
            }
            query.store = storeId;
        }
        if (keyword) {
            const regex = new RegExp(keyword, 'i');
            query.$or = [
                { firstName: regex },
                { lastName: regex },
                { email: regex },
                { phoneNumber: regex },
            ];
        }

        try {
            const customers = await this.customerModel.find(query).exec();
            this.logger.log(`Found ${customers.length} customers`);
            return customers;
        } catch (error) {
            this.logger.error(`Failed to find customers: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Failed to find customers');
        }
    }

    private async validateStoreAccess(storeId: string, userId: string, userRole: UserRoleEnum[]): Promise<any> {
        const storeModel = this.customerModel.db.model('Store');
        let store;

        if (userRole.includes(UserRoleEnum.ADMIN)) {
            store = await storeModel.findById(storeId).exec();
        } else {
            store = await storeModel.findOne({ _id: storeId, owner: userId }).exec();
        }

        return store;
    }
}