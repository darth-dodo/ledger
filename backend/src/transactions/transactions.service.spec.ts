import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { TransactionsService } from './transactions.service.js';
import type { Repository } from 'typeorm';
import type { Transaction } from './entities/transaction.entity.js';

// ---------------------------------------------------------------------------
// Helpers to build a mock TypeORM Repository and QueryBuilder
// ---------------------------------------------------------------------------

function createMockQueryBuilder() {
  const qb = {
    andWhere: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    getMany: vi.fn().mockResolvedValue([]),
  };
  return qb;
}

function createMockRepo(qb: ReturnType<typeof createMockQueryBuilder>) {
  return {
    createQueryBuilder: vi.fn().mockReturnValue(qb),
    findOne: vi.fn(),
    save: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  } as unknown as Repository<Transaction>;
}

// ---------------------------------------------------------------------------
// Fixture data
// ---------------------------------------------------------------------------

function makeTxn(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'txn-uuid-1',
    statementId: 'stmt-uuid-1',
    date: new Date('2025-06-15'),
    description: 'Test Transaction',
    amount: 42.5,
    type: 'debit',
    category: null,
    ...overrides,
  } as Transaction;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TransactionsService', () => {
  let service: TransactionsService;
  let mockRepo: Repository<Transaction>;
  let qb: ReturnType<typeof createMockQueryBuilder>;

  beforeEach(() => {
    qb = createMockQueryBuilder();
    mockRepo = createMockRepo(qb);
    // Construct the service directly, bypassing NestJS DI
    service = new TransactionsService(mockRepo);
  });

  // ---------------------------------------------------------------
  // findAll
  // ---------------------------------------------------------------
  describe('findAll', () => {
    it('returns all transactions with no filters', async () => {
      const txns = [makeTxn(), makeTxn({ id: 'txn-uuid-2' })];
      qb.getMany.mockResolvedValue(txns);

      const result = await service.findAll();

      expect(mockRepo.createQueryBuilder).toHaveBeenCalledWith('txn');
      expect(qb.orderBy).toHaveBeenCalledWith('txn.date', 'DESC');
      expect(qb.getMany).toHaveBeenCalledOnce();
      expect(qb.andWhere).not.toHaveBeenCalled();
      expect(result).toEqual(txns);
    });

    it('applies statementId filter', async () => {
      qb.getMany.mockResolvedValue([]);

      await service.findAll({ statementId: 'stmt-123' });

      expect(qb.andWhere).toHaveBeenCalledWith('txn.statement_id = :statementId', {
        statementId: 'stmt-123',
      });
    });

    it('applies startDate filter', async () => {
      qb.getMany.mockResolvedValue([]);

      await service.findAll({ startDate: '2025-01-01' });

      expect(qb.andWhere).toHaveBeenCalledWith('txn.date >= :startDate', {
        startDate: '2025-01-01',
      });
    });

    it('applies endDate filter', async () => {
      qb.getMany.mockResolvedValue([]);

      await service.findAll({ endDate: '2025-12-31' });

      expect(qb.andWhere).toHaveBeenCalledWith('txn.date <= :endDate', { endDate: '2025-12-31' });
    });

    it('applies date range (startDate and endDate)', async () => {
      qb.getMany.mockResolvedValue([]);

      await service.findAll({ startDate: '2025-01-01', endDate: '2025-06-30' });

      expect(qb.andWhere).toHaveBeenCalledTimes(2);
      expect(qb.andWhere).toHaveBeenCalledWith('txn.date >= :startDate', {
        startDate: '2025-01-01',
      });
      expect(qb.andWhere).toHaveBeenCalledWith('txn.date <= :endDate', { endDate: '2025-06-30' });
    });

    it('applies category filter', async () => {
      qb.getMany.mockResolvedValue([]);

      await service.findAll({ category: 'groceries' });

      expect(qb.andWhere).toHaveBeenCalledWith('txn.category = :category', {
        category: 'groceries',
      });
    });

    it('applies minAmount filter', async () => {
      qb.getMany.mockResolvedValue([]);

      await service.findAll({ minAmount: 100 });

      expect(qb.andWhere).toHaveBeenCalledWith('txn.amount >= :minAmount', { minAmount: 100 });
    });

    it('applies maxAmount filter', async () => {
      qb.getMany.mockResolvedValue([]);

      await service.findAll({ maxAmount: 500 });

      expect(qb.andWhere).toHaveBeenCalledWith('txn.amount <= :maxAmount', { maxAmount: 500 });
    });

    it('applies amount range (minAmount and maxAmount)', async () => {
      qb.getMany.mockResolvedValue([]);

      await service.findAll({ minAmount: 10, maxAmount: 200 });

      expect(qb.andWhere).toHaveBeenCalledWith('txn.amount >= :minAmount', { minAmount: 10 });
      expect(qb.andWhere).toHaveBeenCalledWith('txn.amount <= :maxAmount', { maxAmount: 200 });
    });

    it('applies type filter', async () => {
      qb.getMany.mockResolvedValue([]);

      await service.findAll({ type: 'credit' });

      expect(qb.andWhere).toHaveBeenCalledWith('txn.type = :type', { type: 'credit' });
    });

    it('applies multiple filters simultaneously', async () => {
      qb.getMany.mockResolvedValue([]);

      await service.findAll({
        statementId: 'stmt-1',
        category: 'dining',
        type: 'debit',
      });

      expect(qb.andWhere).toHaveBeenCalledTimes(3);
    });

    it('does not apply minAmount filter when value is undefined', async () => {
      qb.getMany.mockResolvedValue([]);

      await service.findAll({ minAmount: undefined });

      // andWhere should not be called for minAmount
      expect(qb.andWhere).not.toHaveBeenCalled();
    });

    it('applies minAmount filter when value is 0', async () => {
      qb.getMany.mockResolvedValue([]);

      await service.findAll({ minAmount: 0 });

      expect(qb.andWhere).toHaveBeenCalledWith('txn.amount >= :minAmount', { minAmount: 0 });
    });
  });

  // ---------------------------------------------------------------
  // findOne
  // ---------------------------------------------------------------
  describe('findOne', () => {
    it('returns the transaction when found', async () => {
      const txn = makeTxn();
      (mockRepo.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(txn);

      const result = await service.findOne('txn-uuid-1');

      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'txn-uuid-1' },
      });
      expect(result).toEqual(txn);
    });

    it('throws NotFoundException when transaction does not exist', async () => {
      (mockRepo.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('nonexistent-id')).rejects.toThrow(
        'Transaction nonexistent-id not found',
      );
    });
  });

  // ---------------------------------------------------------------
  // update
  // ---------------------------------------------------------------
  describe('update', () => {
    it('updates the category of a transaction', async () => {
      const txn = makeTxn();
      (mockRepo.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(txn);
      (mockRepo.save as ReturnType<typeof vi.fn>).mockImplementation((entity: Transaction) =>
        Promise.resolve(entity),
      );

      const result = await service.update('txn-uuid-1', {
        category: 'groceries',
      });

      expect(result.category).toBe('groceries');
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'groceries' }),
      );
    });

    it('updates the description of a transaction', async () => {
      const txn = makeTxn();
      (mockRepo.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(txn);
      (mockRepo.save as ReturnType<typeof vi.fn>).mockImplementation((entity: Transaction) =>
        Promise.resolve(entity),
      );

      const result = await service.update('txn-uuid-1', {
        description: 'Updated Description',
      });

      expect(result.description).toBe('Updated Description');
    });

    it('updates both category and description at once', async () => {
      const txn = makeTxn();
      (mockRepo.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(txn);
      (mockRepo.save as ReturnType<typeof vi.fn>).mockImplementation((entity: Transaction) =>
        Promise.resolve(entity),
      );

      const result = await service.update('txn-uuid-1', {
        category: 'dining',
        description: 'Dinner',
      });

      expect(result.category).toBe('dining');
      expect(result.description).toBe('Dinner');
    });

    it('throws NotFoundException if transaction to update does not exist', async () => {
      (mockRepo.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.update('missing-id', { category: 'groceries' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('does not modify fields that are not provided', async () => {
      const txn = makeTxn({
        category: 'original',
        description: 'Original Desc',
      });
      (mockRepo.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(txn);
      (mockRepo.save as ReturnType<typeof vi.fn>).mockImplementation((entity: Transaction) =>
        Promise.resolve(entity),
      );

      const result = await service.update('txn-uuid-1', {
        category: 'new-cat',
      });

      expect(result.category).toBe('new-cat');
      expect(result.description).toBe('Original Desc');
    });
  });

  // ---------------------------------------------------------------
  // createMany
  // ---------------------------------------------------------------
  describe('createMany', () => {
    it('creates multiple transactions for a statement', async () => {
      const input = [
        {
          date: new Date('2025-01-01'),
          description: 'Coffee',
          amount: 5,
          type: 'debit',
          category: 'dining',
        },
        {
          date: new Date('2025-01-02'),
          description: 'Salary',
          amount: 3000,
          type: 'credit',
        },
      ];

      (mockRepo.create as ReturnType<typeof vi.fn>).mockImplementation(
        (data: Partial<Transaction>) => ({ id: 'generated-id', ...data }) as Transaction,
      );
      (mockRepo.save as ReturnType<typeof vi.fn>).mockImplementation((entities: Transaction[]) =>
        Promise.resolve(entities),
      );

      const result = await service.createMany('stmt-uuid-1', input);

      expect(mockRepo.create).toHaveBeenCalledTimes(2);

      // First call: with category
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          statementId: 'stmt-uuid-1',
          description: 'Coffee',
          amount: 5,
          type: 'debit',
          category: 'dining',
        }),
      );

      // Second call: category defaults to null
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          statementId: 'stmt-uuid-1',
          description: 'Salary',
          amount: 3000,
          type: 'credit',
          category: null,
        }),
      );

      expect(mockRepo.save).toHaveBeenCalledOnce();
      expect(result).toHaveLength(2);
    });

    it('handles empty transaction array', async () => {
      (mockRepo.save as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await service.createMany('stmt-uuid-1', []);

      expect(mockRepo.create).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------
  // removeByStatement
  // ---------------------------------------------------------------
  describe('removeByStatement', () => {
    it('deletes all transactions for a given statementId', async () => {
      (mockRepo.delete as ReturnType<typeof vi.fn>).mockResolvedValue({
        affected: 5,
      });

      await service.removeByStatement('stmt-uuid-1');

      expect(mockRepo.delete).toHaveBeenCalledWith({
        statementId: 'stmt-uuid-1',
      });
    });

    it('does not throw when no transactions match the statementId', async () => {
      (mockRepo.delete as ReturnType<typeof vi.fn>).mockResolvedValue({
        affected: 0,
      });

      await expect(service.removeByStatement('nonexistent-stmt')).resolves.toBeUndefined();
    });
  });
});
