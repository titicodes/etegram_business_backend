import { Body, Controller, Get, Post, Put, Delete, Param, Request, UseGuards } from '@nestjs/common';
import { StoreService } from './store.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { JwtAuthGuard } from '../auth/guard/jwtGuard';


@Controller('stores')
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createStoreDto: CreateStoreDto, @Request() req) {
    return this.storeService.create(createStoreDto, req.user._id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':parentStoreId/branches')
  createBranch(@Body() createStoreDto: CreateStoreDto, @Param('parentStoreId') parentStoreId: string, @Request() req) {
    return this.storeService.createBranch(createStoreDto, req.user._id, parentStoreId);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findByOwner(@Request() req) {
    return this.storeService.findByOwner(req.user._id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findById(@Param('id') id: string, @Request() req) {
    return this.storeService.findById(id, req.user._id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(@Param('id') id: string, @Body() updateStoreDto: UpdateStoreDto, @Request() req) {
    return this.storeService.update(id, updateStoreDto, req.user._id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  delete(@Param('id') id: string, @Request() req) {
    return this.storeService.delete(id, req.user._id);
  }
}