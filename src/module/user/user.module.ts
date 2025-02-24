import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InterestModule } from '../interest/interest.module';
import { RepositoryModule } from '../repository/repository.module';
import { User, UserSchema } from './schema/user.schema';
import { UserFactory } from './user-factory';
import { UserController } from './user.controller';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';


@Module({
    imports: [
     
      MongooseModule.forFeature([
        { name: User.name, schema: UserSchema },
       
      ]),
      InterestModule,
      RepositoryModule,
     
   
    ],
    controllers: [UserController],
    providers: [UserService, UserRepository, UserFactory, ],
    exports: [UserService, UserRepository, UserFactory,],
  })
export class UserModule {}
