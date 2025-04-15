import { Controller, Post, Body, Get, Param, Put, Delete } from '@nestjs/common';
import { SupplyDto } from './dto/supply.dto';
import { UpdateSupplierDto } from './dto/update-supply.dto';
import { ApiTags } from '@nestjs/swagger';
import { SupplierService } from './supply.service';

@ApiTags('suppliers')
@Controller('suppliers')
export class SupplierController {
    constructor(private readonly supplierService: SupplierService) { }

    @Post()
    async createSupplier(@Body() createSupplierDto: SupplyDto) {
        const result = await this.supplierService.createSupplier(createSupplierDto);
    
        console.log('Controller Result:', result); // Debugging
    
        return {
            success: result.success,
            data: result.data, // Ensure this includes the full supplier data
            message: result.message,
        };
    }
    


    @Put(':id')
    async updateSupplier(@Param('id') id: string, @Body() updateSupplierDto: UpdateSupplierDto) {
        return this.supplierService.updateSupplier(id, updateSupplierDto);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.supplierService.findOne({ _id: id });
    }

    @Get()
    async findAll(@Param('keyword') keyword?: string) {
        return this.supplierService.findAll(keyword);
    }

    // @Delete(':id')
    // async remove(@Param('id') id: string) {
    //     return this.supplierService.remove(id);
    // }
}