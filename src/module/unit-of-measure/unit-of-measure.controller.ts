import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { UnitOfMeasureService } from './unit-of-measure.service';
import { CreateUnitOfMeasureDto } from './dto/create-unit-of-measure.dto';
import { UpdateUnitOfMeasureDto } from './dto/update-unit-of-measure.dto';

@Controller('unit-of-measures')
export class UnitOfMeasureController {
  constructor(private readonly unitOfMeasureService: UnitOfMeasureService) {}

  @Get()
  findAll() {
    return this.unitOfMeasureService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.unitOfMeasureService.findOne(id);
  }

  @Post()
  create(@Body() createUnitOfMeasureDto: CreateUnitOfMeasureDto) {
    return this.unitOfMeasureService.create(createUnitOfMeasureDto);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateUnitOfMeasureDto: UpdateUnitOfMeasureDto,
  ) {
    return this.unitOfMeasureService.update(id, updateUnitOfMeasureDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.unitOfMeasureService.remove(id);
  }
}
