import { UserRoleEnum } from "src/common/enums/user.enum";


export interface payload{
    id: string;
    role:UserRoleEnum[]
}