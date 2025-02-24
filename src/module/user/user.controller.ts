import { Controller } from '@nestjs/common';
import { CoreController } from 'src/common/constants/core/controller.core';
import { UserService } from './user.service';

@Controller('user')
export class UserController extends CoreController {
    constructor(private readonly userService:UserService){
        super();
    }
    
}
