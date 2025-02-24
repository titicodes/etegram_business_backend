import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UnitOfMeasure, UnitOfMeasureDocument } from './schema/unit-of-mesure.schema';
import { CreateUnitOfMeasureDto } from './dto/create-unit-of-measure.dto';
import { UpdateUnitOfMeasureDto } from './dto/update-unit-of-measure.dto';

@Injectable()
export class UnitOfMeasureService {
  constructor(
    @InjectModel(UnitOfMeasure.name)
    private readonly unitOfMeasureModel: Model<UnitOfMeasureDocument>,
  ) {}

  async findAll(): Promise<UnitOfMeasure[]> {
    return this.unitOfMeasureModel.find();
  }

  async findOne(id: string): Promise<UnitOfMeasure | null> {
    return this.unitOfMeasureModel.findById(id);
  }

  async create(
    createUnitOfMeasureDto: CreateUnitOfMeasureDto,
  ): Promise<UnitOfMeasure> {
    const createdUnitOfMeasure = new this.unitOfMeasureModel(
      createUnitOfMeasureDto,
    );
    return createdUnitOfMeasure.save();
  }

  async update(
    id: string,
    updateUnitOfMeasureDto: UpdateUnitOfMeasureDto,
  ): Promise<UnitOfMeasure | null> {
    return this.unitOfMeasureModel.findByIdAndUpdate(
      id,
      updateUnitOfMeasureDto,
      { new: true },
    );
  }

  async remove(id: string): Promise<UnitOfMeasure | null> {
    return this.unitOfMeasureModel.findByIdAndDelete(id);
  }
}