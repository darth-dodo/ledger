import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TransactionsService, Transaction } from './transactions.service';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let httpTesting: HttpTestingController;

  const mockTransaction: Transaction = {
    id: 'tx-1',
    statementId: 'stmt-1',
    date: '2025-06-15',
    description: 'Grocery Store',
    amount: 45.99,
    type: 'debit',
    category: 'food',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TransactionsService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  describe('getTransactions', () => {
    it('should make GET request with no params when no filters provided', () => {
      const mockData = [mockTransaction];

      service.getTransactions().subscribe((transactions) => {
        expect(transactions).toEqual(mockData);
      });

      const req = httpTesting.expectOne('http://localhost:3000/transactions');
      expect(req.request.method).toBe('GET');
      expect(req.request.params.keys().length).toBe(0);
      req.flush(mockData);
    });

    it('should make GET request with no params when filters is undefined', () => {
      service.getTransactions(undefined).subscribe();

      const req = httpTesting.expectOne('http://localhost:3000/transactions');
      expect(req.request.params.keys().length).toBe(0);
      req.flush([]);
    });

    it('should set all filter params when all filters are provided', () => {
      const filters = {
        statementId: 'stmt-1',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        category: 'food',
        minAmount: 10,
        maxAmount: 100,
        type: 'debit' as const,
      };

      service.getTransactions(filters).subscribe();

      const req = httpTesting.expectOne((r) =>
        r.url === 'http://localhost:3000/transactions',
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('statementId')).toBe('stmt-1');
      expect(req.request.params.get('startDate')).toBe('2025-01-01');
      expect(req.request.params.get('endDate')).toBe('2025-12-31');
      expect(req.request.params.get('category')).toBe('food');
      expect(req.request.params.get('minAmount')).toBe('10');
      expect(req.request.params.get('maxAmount')).toBe('100');
      expect(req.request.params.get('type')).toBe('debit');
      req.flush([mockTransaction]);
    });

    it('should only set params for provided filters', () => {
      const filters = {
        category: 'transport',
        type: 'credit' as const,
      };

      service.getTransactions(filters).subscribe();

      const req = httpTesting.expectOne((r) =>
        r.url === 'http://localhost:3000/transactions',
      );
      expect(req.request.params.get('category')).toBe('transport');
      expect(req.request.params.get('type')).toBe('credit');
      expect(req.request.params.has('statementId')).toBe(false);
      expect(req.request.params.has('startDate')).toBe(false);
      expect(req.request.params.has('endDate')).toBe(false);
      expect(req.request.params.has('minAmount')).toBe(false);
      expect(req.request.params.has('maxAmount')).toBe(false);
      req.flush([]);
    });

    it('should handle minAmount and maxAmount of zero', () => {
      const filters = { minAmount: 0, maxAmount: 0 };

      service.getTransactions(filters).subscribe();

      const req = httpTesting.expectOne((r) =>
        r.url === 'http://localhost:3000/transactions',
      );
      expect(req.request.params.get('minAmount')).toBe('0');
      expect(req.request.params.get('maxAmount')).toBe('0');
      req.flush([]);
    });

    it('should not set params for empty string filter values', () => {
      const filters = { statementId: '', category: '' };

      service.getTransactions(filters).subscribe();

      const req = httpTesting.expectOne('http://localhost:3000/transactions');
      expect(req.request.params.has('statementId')).toBe(false);
      expect(req.request.params.has('category')).toBe(false);
      req.flush([]);
    });
  });

  describe('updateTransaction', () => {
    it('should make PATCH request with category update', () => {
      const updates = { category: 'entertainment' };
      const expected = { ...mockTransaction, category: 'entertainment' };

      service.updateTransaction('tx-1', updates).subscribe((result) => {
        expect(result).toEqual(expected);
      });

      const req = httpTesting.expectOne('http://localhost:3000/transactions/tx-1');
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(updates);
      req.flush(expected);
    });

    it('should make PATCH request with description update', () => {
      const updates = { description: 'Updated description' };

      service.updateTransaction('tx-2', updates).subscribe();

      const req = httpTesting.expectOne('http://localhost:3000/transactions/tx-2');
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(updates);
      req.flush({ ...mockTransaction, id: 'tx-2', ...updates });
    });

    it('should make PATCH request with both category and description', () => {
      const updates = { category: 'bills', description: 'Electric bill' };

      service.updateTransaction('tx-1', updates).subscribe();

      const req = httpTesting.expectOne('http://localhost:3000/transactions/tx-1');
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(updates);
      req.flush({ ...mockTransaction, ...updates });
    });
  });
});
