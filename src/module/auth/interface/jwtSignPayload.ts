import { UserRoleEnum } from "src/common/enums/user.enum";


export interface payload {
  _id: string;
  email: string;
  role: UserRoleEnum[]; // Kept as required to match current interface
}