import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Supply, SupplyDocument } from './schema/supply.schema';
import { UpdateSupplierDto } from './dto/update-supply.dto';
import { SupplyDto } from './dto/supply.dto';

@Injectable()
export class SupplierService {
    constructor(
        @InjectModel(Supply.name) private readonly supplierModel: Model<SupplyDocument>,
    ) { }

    async createSupplier(createSupplierDto: SupplyDto): Promise<Supply> {
        const existingSupplier = await this.supplierModel.findOne({
            email: createSupplierDto.email,
        });

        if (existingSupplier) {
            throw new ConflictException('Supplier with this email already exists');
        }

        const createdSupplier = new this.supplierModel({ ...createSupplierDto });
        return createdSupplier.save();
    }

    async updateSupplier(id: string, updateSupplierDto: UpdateSupplierDto): Promise<Supply> {
        const existingSupplier = await this.supplierModel.findById(id);

        if (!existingSupplier) {
            throw new NotFoundException('Supplier not found');
        }

        Object.assign(existingSupplier, updateSupplierDto);
        return existingSupplier.save();
    }

    async findOne(filter: object): Promise<Supply | null> {
        return this.supplierModel.findOne(filter).exec();
      }
    
      async findAll(keyword?: string): Promise<Supply[]> {
        if (keyword) {
          const regex = new RegExp(keyword, 'i');
          return this.supplierModel.find({
            $or: [
              { businessName: regex },
              { email: regex },
              { phoneNumber: regex },
            ],
          }).exec();
        } else {
          return this.supplierModel.find().exec();
        }
      }
}
