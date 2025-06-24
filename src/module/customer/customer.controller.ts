
import { Body, Controller, Delete, Get, Param, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { JwtAuthGuard } from '../auth/guard/jwtGuard';
import { CreateCustomerDto } from './dto/customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Controller('customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createDto: CreateCustomerDto, @Request() req: any) {
    return this.customerService.createCustomer(createDto, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(
    @Query('storeId') storeId: string,
    @Query('keyword') keyword: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Request() req: any,
  ) {
    return this.customerService.findAll(req.user, storeId, keyword, parseInt(limit), parseInt(page));
  }

  @UseGuards(JwtAuthGuard)
  @Get('birthdays')
  findUpcomingBirthdays(
    @Query('storeId') storeId: string,
    @Request() req: any,
  ) {
    return this.customerService.findUpcomingBirthdays(req.user, storeId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.customerService.findOne(req.user, { id });
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateCustomerDto, @Request() req: any) {
    return this.customerService.updateCustomer(id, updateDto, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.customerService.remove(id, req.user);
  }
}
