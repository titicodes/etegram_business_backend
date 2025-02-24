import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CoreRepository } from 'src/common/constants/core/repository';
import { UserDocument, User } from './schema/user.schema';

@Injectable()
export class UserRepository extends CoreRepository<UserDocument> {
  constructor(
    @InjectModel(User.name)
    customerModel: Model<UserDocument>,
  ) {
    super(customerModel);
  }
}
