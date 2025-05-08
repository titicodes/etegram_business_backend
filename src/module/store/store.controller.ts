import { Controller, Post, Body, Get, Param, Patch, Put, Req, UseGuards, BadRequestException } from '@nestjs/common';
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
  @UseGuards(JwtAuthGuard)
  async createStore(@Body() dto: CreateStoreDto, @Req() req: any) {
    const userId = req.user?._id;
    if (!userId) throw new BadRequestException('User not authenticated');
    return this.storeService.create(dto, userId);
  }

  @Get()
  async getMyStores(@Req() req): Promise<Store[]> {
    return this.storeService.findByOwner(req.user._id.toString());
  }

  // Add this new route to get a specific store by ID
  @Get(':id')
  async getStoreById(@Param('id') id: string): Promise<Store> {
    return this.storeService.findById(id);
  }

  @Put(':id')
  async updateStore(@Param('id') id: string, @Body() updateStoreDto: UpdateStoreDto): Promise<Store> {
    return this.storeService.update(id, updateStoreDto);
  }
}