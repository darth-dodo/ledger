import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from './entities/transaction.entity.js';

export interface TransactionFilters {
  statementId?: string;
  startDate?: string;
  endDate?: string;
  category?: string;
  minAmount?: number;
  maxAmount?: number;
  type?: 'debit' | 'credit';
}

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
  ) {}

  async findAll(filters: TransactionFilters = {}): Promise<Transaction[]> {
    const qb = this.transactionRepo.createQueryBuilder('txn');

    if (filters.statementId) {
      qb.andWhere('txn.statement_id = :statementId', {
        statementId: filters.statementId,
      });
    }

    if (filters.startDate) {
      qb.andWhere('txn.date >= :startDate', { startDate: filters.startDate });
    }

    if (filters.endDate) {
      qb.andWhere('txn.date <= :endDate', { endDate: filters.endDate });
    }

    if (filters.category) {
      qb.andWhere('txn.category = :category', { category: filters.category });
    }

    if (filters.minAmount !== undefined) {
      qb.andWhere('txn.amount >= :minAmount', { minAmount: filters.minAmount });
    }

    if (filters.maxAmount !== undefined) {
      qb.andWhere('txn.amount <= :maxAmount', { maxAmount: filters.maxAmount });
    }

    if (filters.type) {
      qb.andWhere('txn.type = :type', { type: filters.type });
    }

    qb.orderBy('txn.date', 'DESC');

    return qb.getMany();
  }

  async findOne(id: string): Promise<Transaction> {
    const transaction = await this.transactionRepo.findOne({ where: { id } });
    if (!transaction) {
      throw new NotFoundException(`Transaction ${id} not found`);
    }
    return transaction;
  }

  async update(
    id: string,
    updates: { category?: string; description?: string },
  ): Promise<Transaction> {
    const transaction = await this.findOne(id);

    if (updates.category !== undefined) {
      transaction.category = updates.category;
    }
    if (updates.description !== undefined) {
      transaction.description = updates.description;
    }

    return this.transactionRepo.save(transaction);
  }

  async createMany(
    statementId: string,
    transactions: {
      date: Date;
      description: string;
      amount: number;
      type: string;
      category?: string;
    }[],
  ): Promise<Transaction[]> {
    const entities = transactions.map((txn) =>
      this.transactionRepo.create({
        statementId,
        date: txn.date,
        description: txn.description,
        amount: txn.amount,
        type: txn.type,
        category: txn.category ?? null,
      }),
    );

    return this.transactionRepo.save(entities);
  }

  async removeByStatement(statementId: string): Promise<void> {
    await this.transactionRepo.delete({ statementId });
  }
}
