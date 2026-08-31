import {
  BadRequestException,
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Expense, ExpenseDocument } from './schema/expense.schema';
import { UserDocument } from '../user/schema/user.schema';
import { UserRoleEnum } from '../../common/enums/user.enum';
import { CreateExpenseDto, UpdateExpenseDto } from './dto/create-expense.dto';

@Injectable()
export class ExpenseService {
  private readonly logger = new Logger(ExpenseService.name);

  constructor(
    @InjectModel(Expense.name)
    private readonly expenseModel: Model<ExpenseDocument>,
    @InjectModel('Store') private readonly storeModel: Model<any>,
  ) {}

  async createExpense(
    createDto: CreateExpenseDto,
    user: UserDocument,
  ): Promise<Expense> {
    this.logger.log(
      `Creating expense for user=${user._id}, store=${createDto.storeId}`,
    );

    if (!user || !user._id) {
      throw new BadRequestException('User information is missing');
    }

    if (!Types.ObjectId.isValid(createDto.storeId)) {
      throw new BadRequestException('Invalid store ID');
    }

    const store = await this.validateStoreAccess(
      createDto.storeId,
      user._id.toString(),
      user.role,
    );
    if (!store) {
      throw new BadRequestException(
        'Store not found or you do not have permission',
      );
    }

    try {
      const expense = await this.expenseModel.create({
        ...createDto,
        user: user._id,
        store: createDto.storeId,
        createdAt: new Date(),
      });
      this.logger.log(`Created expense id=${expense._id}`);
      return expense;
    } catch (error) {
      this.logger.error(
        `Failed to create expense: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to create expense');
    }
  }

  async findAllExpenses(
    user: UserDocument,
    storeId?: string,
  ): Promise<Expense[]> {
    this.logger.log(
      `Fetching expenses for user=${user._id}, store=${storeId || 'all'}`,
    );

    if (!user || !user._id) {
      throw new BadRequestException('User information is missing');
    }

    const query: any = { user: user._id };
    if (storeId) {
      if (!Types.ObjectId.isValid(storeId)) {
        throw new BadRequestException('Invalid store ID');
      }
      const store = await this.validateStoreAccess(
        storeId,
        user._id.toString(),
        user.role,
      );
      if (!store) {
        throw new BadRequestException(
          'Store not found or you do not have permission',
        );
      }
      query.store = storeId;
    }

    try {
      const expenses = await this.expenseModel
        .find(query)
        .sort({ createdAt: -1 })
        .exec();
      this.logger.log(`Found ${expenses.length} expenses`);
      return expenses;
    } catch (error) {
      this.logger.error(
        `Failed to fetch expenses: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to fetch expenses');
    }
  }

  async findExpenseById(id: string, user: UserDocument): Promise<Expense> {
    this.logger.log(`Fetching expense id=${id} for user=${user._id}`);

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid expense ID');
    }

    if (!user || !user._id) {
      throw new BadRequestException('User information is missing');
    }

    try {
      const expense = await this.expenseModel
        .findOne({ _id: id, user: user._id })
        .exec();
      if (!expense) {
        throw new NotFoundException(`Expense with ID ${id} not found`);
      }
      this.logger.log(`Found expense id=${id}`);
      return expense;
    } catch (error) {
      this.logger.error(
        `Failed to fetch expense id=${id}: ${error.message}`,
        error.stack,
      );
      throw error instanceof NotFoundException
        ? error
        : new InternalServerErrorException(
            `Failed to fetch expense with ID ${id}`,
          );
    }
  }

  async updateExpense(
    id: string,
    updateDto: UpdateExpenseDto,
    user: UserDocument,
  ): Promise<Expense> {
    this.logger.log(`Updating expense id=${id} for user=${user._id}`);

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid expense ID');
    }

    if (!user || !user._id) {
      throw new BadRequestException('User information is missing');
    }

    const expense = await this.expenseModel
      .findOne({ _id: id, user: user._id })
      .exec();
    if (!expense) {
      throw new NotFoundException(`Expense with ID ${id} not found`);
    }

    if (updateDto.storeId && updateDto.storeId !== expense.store.toString()) {
      const store = await this.validateStoreAccess(
        updateDto.storeId,
        user._id.toString(),
        user.role,
      );
      if (!store) {
        throw new BadRequestException(
          'Store not found or you do not have permission',
        );
      }
    }

    try {
      const updatedExpense = await this.expenseModel
        .findOneAndUpdate(
          { _id: id, user: user._id },
          { ...updateDto, updatedAt: new Date() },
          { new: true },
        )
        .exec();
      if (!updatedExpense) {
        throw new NotFoundException(`Expense with ID ${id} not found`);
      }
      this.logger.log(`Updated expense id=${id}`);
      return updatedExpense;
    } catch (error) {
      this.logger.error(
        `Failed to update expense id=${id}: ${error.message}`,
        error.stack,
      );
      throw error instanceof NotFoundException
        ? error
        : new InternalServerErrorException(
            `Failed to update expense with ID ${id}`,
          );
    }
  }

  async deleteExpense(
    id: string,
    user: UserDocument,
  ): Promise<{ deleted: boolean }> {
    this.logger.log(`Deleting expense id=${id} for user=${user._id}`);

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid expense ID');
    }

    if (!user || !user._id) {
      throw new BadRequestException('User information is missing');
    }

    try {
      const result = await this.expenseModel
        .deleteOne({ _id: id, user: user._id })
        .exec();
      if (result.deletedCount === 0) {
        throw new NotFoundException(`Expense with ID ${id} not found`);
      }
      this.logger.log(`Deleted expense id=${id}`);
      return { deleted: true };
    } catch (error) {
      this.logger.error(
        `Failed to delete expense id=${id}: ${error.message}`,
        error.stack,
      );
      throw error instanceof NotFoundException
        ? error
        : new InternalServerErrorException(
            `Failed to delete expense with ID ${id}`,
          );
    }
  }

  private async validateStoreAccess(
    storeId: string,
    userId: string,
    userRole: UserRoleEnum[],
  ): Promise<any> {
    if (!Types.ObjectId.isValid(storeId)) {
      throw new BadRequestException('Invalid store ID');
    }

    let store;
    if (userRole.includes(UserRoleEnum.ADMIN)) {
      store = await this.storeModel.findById(storeId).exec();
    } else {
      store = await this.storeModel
        .findOne({ _id: storeId, owner: userId })
        .exec();
    }

    if (!store) {
      this.logger.warn(
        `Store access denied for storeId=${storeId}, userId=${userId}`,
      );
    }

    return store;
  }
}
