import { Controller, Post, Body, Get, Param, Patch, Put, Req, UseGuards } from '@nestjs/common';
import { StoreService } from './store.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { Store } from './schema/store.schema';
import { JwtAuthGuard } from '../auth/guard/jwtGuard';

@Controller('stores')
@UseGuards(JwtAuthGuard)
export class StoreController {
  constructor(private readonly storeService: StoreService) { }

  @Post()
  async createStore(@Body() createStoreDto: CreateStoreDto, @Req() req): Promise<Store> {
    return this.storeService.create({ ...createStoreDto, owner: req.user._id.toString() });
  }

  @Get()
  async getMyStores(@Req() req): Promise<Store[]> {
    return this.storeService.findByOwner(req.user._id.toString());
  }

  @Put(':id')
  async updateStore(@Param('id') id: string, @Body() updateStoreDto: UpdateStoreDto): Promise<Store> {
    return this.storeService.update(id, updateStoreDto);
  }

}