import { PartialType } from '@nestjs/mapped-types';
import { SupplyDto } from "./supply.dto";

export class UpdateSupplierDto extends PartialType(SupplyDto) {}