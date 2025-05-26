import { Body, Controller, Delete, Get, Param, Post, Put, Request, UseGuards } from '@nestjs/common';
import { StoreService } from './store.service';
import { JwtAuthGuard } from '../auth/guard/jwtGuard';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';

@Controller('stores')
export class StoreController {
  constructor(private readonly storeService: StoreService) { }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createDto: CreateStoreDto, @Request() req: any) {
    return this.storeService.create(createDto, req.user._id.toString());
  }

  @UseGuards(JwtAuthGuard)
  @Post(':parentStoreId/branches')
  createBranch(
    @Body() createDto: CreateStoreDto,
    @Param('parentStoreId') parentStoreId: string,
    @Request() req: any,
  ) {
    return this.storeService.createBranch(createDto, req.user._id.toString(), parentStoreId);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findByOwner(@Request() req: any) {
    return this.storeService.findByOwner(req.user._id.toString());
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findById(@Param('id') id: string, @Request() req: any) {
    return this.storeService.findById(id, req.user._id.toString());
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateStoreDto, @Request() req: any) {
    return this.storeService.update(id, updateDto, req.user._id.toString());
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  delete(@Param('id') id: string, @Request() req: any) {
    return this.storeService.delete(id, req.user._id.toString());
  }
}