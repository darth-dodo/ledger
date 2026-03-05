import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  Inject,
  ParseUUIDPipe,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service.js';
import { Transaction } from './entities/transaction.entity.js';

@Controller('transactions')
export class TransactionsController {
  constructor(
    @Inject(TransactionsService)
    private readonly transactionsService: TransactionsService,
  ) {}

  @Get()
  async findAll(
    @Query('statementId') statementId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('category') category?: string,
    @Query('minAmount') minAmount?: string,
    @Query('maxAmount') maxAmount?: string,
    @Query('type') type?: 'debit' | 'credit',
  ): Promise<Transaction[]> {
    return this.transactionsService.findAll({
      statementId,
      startDate,
      endDate,
      category,
      minAmount: minAmount !== undefined ? parseFloat(minAmount) : undefined,
      maxAmount: maxAmount !== undefined ? parseFloat(maxAmount) : undefined,
      type,
    });
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { category?: string; description?: string },
  ): Promise<Transaction> {
    return this.transactionsService.update(id, body);
  }
}
