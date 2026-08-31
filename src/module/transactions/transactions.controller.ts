import { Body, Controller, Post } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CoreController } from 'src/common/constants/core/controller.core';
import { Public } from 'src/common/constants/decorators/public.decorator';
import { ResponseMessage } from 'src/common/constants/decorators/response.decorator';
import { RESPONSE_CONSTANT } from 'src/common/constants/response.constants';
import { ViewTransactionDto } from './dto/view-transaction.dto';

@Controller('transactions')
export class TransactionsController extends CoreController {
  constructor(private readonly transactionService: TransactionsService) {
    super();
  }

  @Public()
  @Post('get-transaction')
  @ResponseMessage(RESPONSE_CONSTANT.TRANSACTION.TRANSFER_SUCCESSFUL)
  async getAllTransactions(@Body() payload: ViewTransactionDto) {
    return await this.transactionService.getTransaction(payload);
  }
}
