import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { CreateSupplyDto } from './dto/supply.dto';
import { UpdateSupplierDto } from './dto/update-supply.dto';
import { UserDocument } from '../user/schema/user.schema';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guard/jwtGuard';
import { SupplierService } from './supply.service';

@Controller('suppliers')
@UseGuards(JwtAuthGuard)
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  // POST /suppliers
  @Post()
  async createSupplier(@Body() dto: CreateSupplyDto, @Req() req) {
    const user = req.user as UserDocument;
    return await this.supplierService.createSupplier(dto, user);
  }

  // PUT /suppliers/:id
  @Put(':id')
  async updateSupplier(
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
    @Req() req,
  ) {
    const user = req.user as UserDocument;
    return await this.supplierService.updateSupplier(id, dto, user);
  }

  // GET /suppliers/:id
  @Get(':id')
  async getSupplierById(@Param('id') id: string, @Req() req) {
    const user = req.user as UserDocument;
    return await this.supplierService.findOne(user, { id });
  }

  // GET /suppliers/email?email=abc@example.com
  @Get('email')
  async getSupplierByEmail(@Query('email') email: string, @Req() req) {
    const user = req.user as UserDocument;
    if (!email) throw new BadRequestException('Email is required');
    return await this.supplierService.findOne(user, { email });
  }

  // GET /suppliers?storeId=abc&keyword=john
  @Get()
  async getAllSuppliers(
    @Query('storeId') storeId: string,
    @Query('keyword') keyword: string,
    @Req() req,
  ) {
    const user = req.user as UserDocument;
    return await this.supplierService.findAll(user, storeId, keyword);
  }
}
