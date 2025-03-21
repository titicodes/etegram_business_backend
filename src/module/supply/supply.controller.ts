import { Controller, Post, Body, Patch, Param, Get, Query } from '@nestjs/common';
import { UpdateSupplierDto } from './dto/update-supply.dto';
import { SupplierService } from './supply.service';
import { SupplyDto } from './dto/supply.dto';
import { Supply } from './schema/supply.schema';


@Controller('suppliers')
export class SupplierController {
    constructor(private readonly supplierService: SupplierService) { }

    @Post()
    async createSupplier(@Body() createSupplierDto: SupplyDto): Promise<Supply> {
        return this.supplierService.createSupplier(createSupplierDto);
    }

    @Patch(':id')
    async updateSupplier(@Param('id') id: string, @Body() updateSupplierDto: UpdateSupplierDto): Promise<Supply> {
        return this.supplierService.updateSupplier(id, updateSupplierDto);
    }

    @Get()
    async findAll(@Query('keyword') keyword?: string): Promise<Supply[]> {
        return this.supplierService.findAll(keyword);
    }

    @Get(':id')
    async findOne(@Param('id') id: string): Promise<Supply | null> {
        return this.supplierService.findOne({ _id: id });
    }
}