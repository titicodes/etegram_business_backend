import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { HashPassword } from 'src/utils/utils';

@Injectable()
export class UserFactory {
  async create(customer: CreateUserDto) {
    const hashedPassword = await HashPassword(customer.password); // Hash the user's password
    const token = this.generateToken(15); // Generate a unique token
    return {
      ...customer,
      password: hashedPassword,
      token,
    };
  }

  // Generate a random alphanumeric token of the specified length
  private generateToken(length: number): string {
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < length; i++) {
      token += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    return token;
  }
}
