import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Customer, CustomerDocument } from './schema/customer.schema';
import { Model } from 'mongoose';
import { CustomerDto } from './dto/customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomerService {
    constructor(
        @InjectModel(Customer.name) private readonly customerModel: Model<CustomerDocument>,
    ) { }

    async createCustomer(dto: CustomerDto): Promise<{ success: boolean; data: Customer; message: string }> {
      try {
          // Check if the customer already exists
          const existingCustomer = await this.customerModel.findOne({ email: dto.email });
          if (existingCustomer) {
              throw new ConflictException("Customer with this email already exists");
          }
  
          // Create the new customer, including all schema properties
          const newCustomer = new this.customerModel({
              ...dto, // Spread the DTO properties into the new document
              // Ensure any required fields are included
              extraPhone: dto.extraPhone || '', // Default to empty string if not provided
              supplierType: dto.supplierType || '', // Default to empty string if not provided
              currency: dto.currency || '', // Default to empty string if not provided
              birthday: dto.birthday || '',
          });
  
          // Save the customer document to the database
          const savedCustomer = await newCustomer.save();
  
          // Retrieve the full customer document from the database
          const fullCustomerDetails = await this.customerModel.findById(savedCustomer._id).lean().exec();
  
          // Return the response with the full customer document
          return {
              success: true,
              data: fullCustomerDetails,  // Return the complete customer document
              message: 'Customer created successfully',
          };
      } catch (err) {
          throw err;
      }
  }
  
  

    async updateCustomer(id: string, updateCustomerDto: UpdateCustomerDto): Promise<Customer> {
        const existingCustomer = await this.customerModel.findById(id);
    
        if (!existingCustomer) {
            throw new NotFoundException('Customer not found');
        }
    
        Object.assign(existingCustomer, updateCustomerDto);
        return existingCustomer.save();
    }

    async findOne(filter: object): Promise<Customer | null> {
        return this.customerModel.findOne(filter).exec();
    }

    async findAll(keyword?: string): Promise<Customer[]> {
        if (keyword) {
            const regex = new RegExp(keyword, 'i');
            return this.customerModel.find({
                $or: [
                    { firstName: regex },
                    { lastName: regex },
                    { email: regex },
                    { phoneNumber: regex },
                ],
            }).exec();
        } else {
            return this.customerModel.find().exec();
        }
    }
}
