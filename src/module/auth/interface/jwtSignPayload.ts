import { UserRoleEnum } from "src/common/enums/user.enum";


export interface payload{
    _id: string;
    role:UserRoleEnum[]
    email: string; 
}