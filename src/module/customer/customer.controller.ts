import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CustomerDto } from './dto/customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Controller('customer')
export class CustomerController {
    constructor(private readonly customerService: CustomerService) { }

    @Post()
    async createCustomer(@Body() dto: CustomerDto) {
        const result = await this.customerService.createCustomer(dto);
        console.log("Controller Result", result);
        return {
            success: result.success,
            data: result.data,
            message: result.message
        }
    }

    @Put(':id')
    async updateSupplier(@Param('id') id: string, @Body() updateSupplierDto: UpdateCustomerDto) {
        return this.customerService.updateCustomer(id, updateSupplierDto);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.customerService.findOne({ _id: id });
    }

    @Get()
    async findAll(@Param('keyword') keyword?: string) {
        return this.customerService.findAll(keyword);
    }
}
