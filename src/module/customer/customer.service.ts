import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Customer, CustomerDocument } from './schema/customer.schema';
import { UserDocument } from '../user/schema/user.schema';
import { UserRoleEnum } from '../../common/enums/user.enum';
import { CreateCustomerDto } from './dto/customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Store, StoreDocument } from '../store/schema/store.schema';

@Injectable()
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name);

  constructor(
    @InjectModel(Customer.name)
    private readonly customerModel: Model<CustomerDocument>,
    @InjectModel(Store.name) private readonly storeModel: Model<StoreDocument>,
  ) {}

  async createCustomer(
    dto: CreateCustomerDto,
    user: UserDocument,
  ): Promise<{ success: boolean; data: Customer; message: string }> {
    this.logger.log(`Creating customer for user=${user._id}`);

    if (dto.storeId && !Types.ObjectId.isValid(dto.storeId)) {
      throw new BadRequestException('Invalid store ID');
    }

    if (dto.storeId) {
      const store = await this.validateStoreAccess(
        dto.storeId,
        user._id.toString(),
        user.role,
      );
      if (!store) {
        throw new BadRequestException(
          'Store not found or you do not have permission',
        );
      }
    }

    try {
      const existingCustomer = await this.customerModel
        .findOne({ email: dto.email, user: user._id })
        .exec();
      if (existingCustomer) {
        throw new ConflictException(
          `Customer with email ${dto.email} already exists`,
        );
      }

      const [newCustomer] = await this.customerModel.create([
        {
          ...dto,
          user: user._id,
          store: dto.storeId ? new Types.ObjectId(dto.storeId) : undefined,
          extraPhone: dto.extraPhone || '',
          birthday: dto.birthday ? new Date(dto.birthday) : undefined,
          createdAt: new Date(),
        },
      ]);

      const fullCustomer = await this.customerModel
        .findById(newCustomer._id)
        .populate('store', 'name')
        .lean()
        .exec();
      this.logger.log(`Created customer id=${newCustomer._id}`);
      return {
        success: true,
        data: fullCustomer,
        message: 'Customer created successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to create customer: ${error.message}`,
        error.stack,
      );
      throw error instanceof ConflictException
        ? error
        : new InternalServerErrorException('Failed to create customer');
    }
  }

  async updateCustomer(
    id: string,
    dto: UpdateCustomerDto,
    user: UserDocument,
  ): Promise<Customer> {
    this.logger.log(`Updating customer id=${id} for user=${user._id}`);

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid customer ID');
    }

    const customer = await this.customerModel
      .findOne({ _id: id, user: user._id })
      .exec();
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    if (dto.storeId && dto.storeId !== customer.store?.toString()) {
      const store = await this.validateStoreAccess(
        dto.storeId,
        user._id.toString(),
        user.role,
      );
      if (!store) {
        throw new BadRequestException(
          'Store not found or you do not have permission',
        );
      }
    }

    try {
      Object.assign(customer, {
        ...dto,
        extraPhone: dto.extraPhone || customer.extraPhone,
        birthday: dto.birthday ? new Date(dto.birthday) : customer.birthday,
        updatedAt: new Date(),
      });
      const updatedCustomer = await customer.save();
      this.logger.log(`Updated customer id=${id}`);
      return updatedCustomer;
    } catch (error) {
      this.logger.error(
        `Failed to update customer id=${id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        `Failed to update customer with ID ${id}`,
      );
    }
  }

  async findOne(
    user: UserDocument,
    filter: { id?: string; email?: string; storeId?: string },
  ): Promise<Customer | null> {
    this.logger.log(
      `Finding customer for user=${user._id}, filter=${JSON.stringify(filter)}`,
    );

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
      const store = await this.validateStoreAccess(
        filter.storeId,
        user._id.toString(),
        user.role,
      );
      if (!store) {
        throw new BadRequestException(
          'Store not found or you do not have permission',
        );
      }
      query.store = filter.storeId;
    }

    try {
      const customer = await this.customerModel
        .findOne(query)
        .populate('store', 'name')
        .exec();
      this.logger.log(
        customer ? `Found customer id=${customer._id}` : 'No customer found',
      );
      return customer;
    } catch (error) {
      this.logger.error(
        `Failed to find customer: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to find customer');
    }
  }

  async findAll(
    user: UserDocument,
    storeId?: string,
    keyword?: string,
    limit: number = 20,
    page: number = 1,
  ): Promise<{ customers: Customer[]; total: number }> {
    this.logger.log(
      `Finding all customers for user=${user._id}, store=${storeId || 'all'}, keyword=${keyword || 'none'}`,
    );

    const query: any = { user: user._id };
    if (storeId) {
      if (!Types.ObjectId.isValid(storeId)) {
        throw new BadRequestException('Invalid store ID');
      }
      const store = await this.validateStoreAccess(
        storeId,
        user._id.toString(),
        user.role,
      );
      if (!store) {
        throw new BadRequestException(
          'Store not found or you do not have permission',
        );
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
      const total = await this.customerModel.countDocuments(query).exec();
      const customers = await this.customerModel
        .find(query)
        .populate('store', 'name')
        .skip((page - 1) * limit)
        .limit(limit)
        .exec();
      this.logger.log(`Found ${customers.length} customers of ${total}`);
      return { customers, total };
    } catch (error) {
      this.logger.error(
        `Failed to find customers: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to find customers');
    }
  }

  async findUpcomingBirthdays(
    user: UserDocument,
    storeId?: string,
  ): Promise<Customer[]> {
    this.logger.log(
      `Finding upcoming birthdays for user=${user._id}, store=${storeId || 'all'}`,
    );

    const query: any = {
      user: user._id,
      birthday: { $exists: true, $ne: null },
    };
    if (storeId) {
      if (!Types.ObjectId.isValid(storeId)) {
        throw new BadRequestException('Invalid store ID');
      }
      const store = await this.validateStoreAccess(
        storeId,
        user._id.toString(),
        user.role,
      );
      if (!store) {
        throw new BadRequestException(
          'Store not found or you do not have permission',
        );
      }
      query.store = storeId;
    }

    const today = new Date();
    const nextMonth = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      today.getDate(),
    );
    try {
      const customers = await this.customerModel
        .find(query)
        .populate('store', 'name')
        .exec();
      const upcoming = customers.filter((customer) => {
        const birthday = new Date(customer.birthday!);
        const nextBirthday = new Date(
          today.getFullYear(),
          birthday.getMonth(),
          birthday.getDate(),
        );
        if (nextBirthday < today) {
          nextBirthday.setFullYear(today.getFullYear() + 1);
        }
        return nextBirthday >= today && nextBirthday <= nextMonth;
      });
      this.logger.log(
        `Found ${upcoming.length} customers with upcoming birthdays`,
      );
      return upcoming;
    } catch (error) {
      this.logger.error(
        `Failed to find upcoming birthdays: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Failed to find upcoming birthdays',
      );
    }
  }

  async remove(id: string, user: UserDocument): Promise<void> {
    this.logger.log(`Deleting customer id=${id} for user=${user._id}`);

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid customer ID');
    }

    try {
      const result = await this.customerModel
        .findOneAndDelete({ _id: id, user: user._id })
        .exec();
      if (!result) {
        throw new NotFoundException(`Customer with ID ${id} not found`);
      }
      this.logger.log(`Deleted customer id=${id}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete customer id=${id}: ${error.message}`,
        error.stack,
      );
      throw error instanceof NotFoundException
        ? error
        : new InternalServerErrorException(
            `Failed to delete customer with ID ${id}`,
          );
    }
  }

  private async validateStoreAccess(
    storeId: string,
    userId: string,
    userRole: UserRoleEnum[],
  ): Promise<Store | null> {
    let store;
    if (userRole.includes(UserRoleEnum.ADMIN)) {
      store = await this.storeModel.findById(storeId).exec();
    } else {
      store = await this.storeModel
        .findOne({ _id: storeId, owner: userId })
        .exec();
    }
    return store;
  }
}
