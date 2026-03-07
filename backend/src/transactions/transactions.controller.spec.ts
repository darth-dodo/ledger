import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TransactionsController } from './transactions.controller.js';

describe('TransactionsController', () => {
  let controller: TransactionsController;
  let mockService: { findAll: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockService = {
      findAll: vi.fn(),
      update: vi.fn(),
    };
    controller = new TransactionsController(mockService as any);
  });

  describe('findAll', () => {
    it('should call service.findAll with no filters when no query params provided', async () => {
      const expected = [{ id: '1' }, { id: '2' }];
      mockService.findAll.mockResolvedValue(expected);

      const result = await controller.findAll();

      expect(mockService.findAll).toHaveBeenCalledWith({
        statementId: undefined,
        startDate: undefined,
        endDate: undefined,
        category: undefined,
        minAmount: undefined,
        maxAmount: undefined,
        type: undefined,
      });
      expect(result).toBe(expected);
    });

    it('should pass statementId filter to service', async () => {
      mockService.findAll.mockResolvedValue([]);

      await controller.findAll('stmt-123');

      expect(mockService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ statementId: 'stmt-123' }),
      );
    });

    it('should pass date range filters to service', async () => {
      mockService.findAll.mockResolvedValue([]);

      await controller.findAll(undefined, '2025-01-01', '2025-12-31');

      expect(mockService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: '2025-01-01',
          endDate: '2025-12-31',
        }),
      );
    });

    it('should pass category filter to service', async () => {
      mockService.findAll.mockResolvedValue([]);

      await controller.findAll(undefined, undefined, undefined, 'groceries');

      expect(mockService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'groceries' }),
      );
    });

    it('should parse minAmount and maxAmount from strings to numbers', async () => {
      mockService.findAll.mockResolvedValue([]);

      await controller.findAll(
        undefined,
        undefined,
        undefined,
        undefined,
        '10.50',
        '500.99',
      );

      expect(mockService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          minAmount: 10.5,
          maxAmount: 500.99,
        }),
      );
    });

    it('should leave minAmount undefined when not provided', async () => {
      mockService.findAll.mockResolvedValue([]);

      await controller.findAll();

      expect(mockService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          minAmount: undefined,
          maxAmount: undefined,
        }),
      );
    });

    it('should pass type filter to service', async () => {
      mockService.findAll.mockResolvedValue([]);

      await controller.findAll(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'debit',
      );

      expect(mockService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'debit' }),
      );
    });

    it('should pass all filters together to service', async () => {
      mockService.findAll.mockResolvedValue([]);

      await controller.findAll(
        'stmt-1',
        '2025-01-01',
        '2025-06-30',
        'food',
        '5',
        '100',
        'credit',
      );

      expect(mockService.findAll).toHaveBeenCalledWith({
        statementId: 'stmt-1',
        startDate: '2025-01-01',
        endDate: '2025-06-30',
        category: 'food',
        minAmount: 5,
        maxAmount: 100,
        type: 'credit',
      });
    });

    it('should return the result from service.findAll', async () => {
      const transactions = [{ id: 'a', description: 'Test' }];
      mockService.findAll.mockResolvedValue(transactions);

      const result = await controller.findAll();

      expect(result).toBe(transactions);
    });
  });

  describe('update', () => {
    it('should call service.update with id and body', async () => {
      const updated = { id: 'abc-123', category: 'travel' };
      mockService.update.mockResolvedValue(updated);

      const result = await controller.update('abc-123', { category: 'travel' });

      expect(mockService.update).toHaveBeenCalledWith('abc-123', {
        category: 'travel',
      });
      expect(result).toBe(updated);
    });

    it('should pass description update to service', async () => {
      const updated = { id: 'abc-123', description: 'Updated desc' };
      mockService.update.mockResolvedValue(updated);

      const result = await controller.update('abc-123', {
        description: 'Updated desc',
      });

      expect(mockService.update).toHaveBeenCalledWith('abc-123', {
        description: 'Updated desc',
      });
      expect(result).toBe(updated);
    });

    it('should pass both category and description to service', async () => {
      const body = { category: 'food', description: 'Lunch' };
      const updated = { id: 'abc-123', ...body };
      mockService.update.mockResolvedValue(updated);

      const result = await controller.update('abc-123', body);

      expect(mockService.update).toHaveBeenCalledWith('abc-123', body);
      expect(result).toBe(updated);
    });

    it('should pass empty body to service', async () => {
      const updated = { id: 'abc-123' };
      mockService.update.mockResolvedValue(updated);

      const result = await controller.update('abc-123', {});

      expect(mockService.update).toHaveBeenCalledWith('abc-123', {});
      expect(result).toBe(updated);
    });

    it('should propagate errors from service.update', async () => {
      mockService.update.mockRejectedValue(new Error('Not found'));

      await expect(controller.update('bad-id', {})).rejects.toThrow('Not found');
    });
  });
});
