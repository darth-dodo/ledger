import { describe, it, expect } from 'vitest';
import { CsvParser } from './csv.parser.js';

function toBuffer(content: string): Buffer {
  return Buffer.from(content, 'utf-8');
}

describe('CsvParser', () => {
  const parser = new CsvParser();

  // ---------------------------------------------------------------
  // canParse
  // ---------------------------------------------------------------
  describe('canParse', () => {
    it('returns true for .csv extension', () => {
      expect(parser.canParse(Buffer.alloc(0), 'transactions.csv')).toBe(true);
    });

    it('returns true for .CSV extension (case-insensitive)', () => {
      expect(parser.canParse(Buffer.alloc(0), 'FILE.CSV')).toBe(true);
    });

    it('returns false for .pdf extension', () => {
      expect(parser.canParse(Buffer.alloc(0), 'statement.pdf')).toBe(false);
    });

    it('returns false for .xlsx extension', () => {
      expect(parser.canParse(Buffer.alloc(0), 'data.xlsx')).toBe(false);
    });

    it('returns false for filename without extension', () => {
      expect(parser.canParse(Buffer.alloc(0), 'noextension')).toBe(false);
    });
  });

  // ---------------------------------------------------------------
  // parse — standard Amount column
  // ---------------------------------------------------------------
  describe('parse with single Amount column', () => {
    it('parses valid CSV with Date, Description, Amount headers', async () => {
      const csv = [
        'Date,Description,Amount',
        '2025-06-15,Coffee Shop,-4.50',
        '2025-06-16,Salary Deposit,3000.00',
      ].join('\n');

      const result = await parser.parse(toBuffer(csv));

      expect(result).toHaveLength(2);

      expect(result[0]).toEqual({
        date: new Date('2025-06-15T00:00:00'),
        description: 'Coffee Shop',
        amount: 4.5,
        type: 'debit',
      });

      expect(result[1]).toEqual({
        date: new Date('2025-06-16T00:00:00'),
        description: 'Salary Deposit',
        amount: 3000,
        type: 'credit',
      });
    });

    it('treats negative amounts as debit and positive as credit', async () => {
      const csv = [
        'Date,Description,Amount',
        '2025-01-01,Withdrawal,-100.00',
        '2025-01-02,Refund,50.00',
      ].join('\n');

      const result = await parser.parse(toBuffer(csv));

      expect(result[0]!.type).toBe('debit');
      expect(result[0]!.amount).toBe(100);
      expect(result[1]!.type).toBe('credit');
      expect(result[1]!.amount).toBe(50);
    });

    it('skips rows with zero amount', async () => {
      const csv = [
        'Date,Description,Amount',
        '2025-01-01,Zero Transaction,0.00',
        '2025-01-02,Valid Transaction,10.00',
      ].join('\n');

      const result = await parser.parse(toBuffer(csv));
      expect(result).toHaveLength(1);
      expect(result[0]!.description).toBe('Valid Transaction');
    });

    it('handles amounts with currency symbols and commas', async () => {
      const csv = ['Date,Description,Amount', '2025-03-01,Big Purchase,"$1,250.99"'].join('\n');

      const result = await parser.parse(toBuffer(csv));

      expect(result).toHaveLength(1);
      expect(result[0]!.amount).toBe(1250.99);
    });
  });

  // ---------------------------------------------------------------
  // parse — separate Debit/Credit columns
  // ---------------------------------------------------------------
  describe('parse with separate Debit/Credit columns', () => {
    it('parses CSV with Debit and Credit columns', async () => {
      const csv = [
        'Date,Description,Debit,Credit',
        '2025-07-01,ATM Withdrawal,200.00,',
        '2025-07-02,Interest,,15.50',
      ].join('\n');

      const result = await parser.parse(toBuffer(csv));

      expect(result).toHaveLength(2);

      expect(result[0]).toEqual({
        date: new Date('2025-07-01T00:00:00'),
        description: 'ATM Withdrawal',
        amount: 200,
        type: 'debit',
      });

      expect(result[1]).toEqual({
        date: new Date('2025-07-02T00:00:00'),
        description: 'Interest',
        amount: 15.5,
        type: 'credit',
      });
    });

    it('skips rows where both debit and credit are empty', async () => {
      const csv = [
        'Date,Description,Debit,Credit',
        '2025-07-01,Mystery Row,,',
        '2025-07-02,Valid Debit,50.00,',
      ].join('\n');

      const result = await parser.parse(toBuffer(csv));

      expect(result).toHaveLength(1);
      expect(result[0]!.description).toBe('Valid Debit');
    });

    it('recognizes alternative header names (Withdrawal, Deposit)', async () => {
      const csv = [
        'Transaction Date,Narration,Withdrawal,Deposit',
        '2025-08-10,Rent Payment,1500.00,',
        '2025-08-15,Salary,,5000.00',
      ].join('\n');

      const result = await parser.parse(toBuffer(csv));

      expect(result).toHaveLength(2);
      expect(result[0]!.type).toBe('debit');
      expect(result[0]!.amount).toBe(1500);
      expect(result[1]!.type).toBe('credit');
      expect(result[1]!.amount).toBe(5000);
    });
  });

  // ---------------------------------------------------------------
  // parse — date formats
  // ---------------------------------------------------------------
  describe('date format handling', () => {
    it('parses YYYY-MM-DD format', async () => {
      const csv = 'Date,Description,Amount\n2025-12-25,Christmas Gift,-50.00';
      const result = await parser.parse(toBuffer(csv));

      expect(result).toHaveLength(1);
      expect(result[0]!.date).toEqual(new Date('2025-12-25T00:00:00'));
    });

    it('parses DD/MM/YYYY format', async () => {
      const csv = 'Date,Description,Amount\n25/12/2025,Christmas Gift,-50.00';
      const result = await parser.parse(toBuffer(csv));

      expect(result).toHaveLength(1);
      expect(result[0]!.date).toEqual(new Date('2025-12-25T00:00:00'));
    });

    it('parses DD-MM-YYYY format', async () => {
      const csv = 'Date,Description,Amount\n25-12-2025,Christmas Gift,-50.00';
      const result = await parser.parse(toBuffer(csv));

      expect(result).toHaveLength(1);
      expect(result[0]!.date).toEqual(new Date('2025-12-25T00:00:00'));
    });

    it('skips rows with unparseable dates', async () => {
      const csv = [
        'Date,Description,Amount',
        'not-a-date,Bad Row,-10.00',
        '2025-01-01,Good Row,-20.00',
      ].join('\n');

      const result = await parser.parse(toBuffer(csv));

      expect(result).toHaveLength(1);
      expect(result[0]!.description).toBe('Good Row');
    });
  });

  // ---------------------------------------------------------------
  // parse — edge cases
  // ---------------------------------------------------------------
  describe('edge cases', () => {
    it('returns empty array for empty CSV', async () => {
      const result = await parser.parse(toBuffer(''));
      expect(result).toEqual([]);
    });

    it('returns empty array for CSV with only headers', async () => {
      const result = await parser.parse(toBuffer('Date,Description,Amount\n'));
      expect(result).toEqual([]);
    });

    it('returns empty array for CSV with no recognizable headers', async () => {
      const csv = 'Foo,Bar,Baz\n1,2,3';
      const result = await parser.parse(toBuffer(csv));
      expect(result).toEqual([]);
    });

    it('returns empty array when date and description headers exist but no amount-type header', async () => {
      const csv = 'Date,Description,Foo\n2025-01-01,Test,123';
      const result = await parser.parse(toBuffer(csv));
      expect(result).toEqual([]);
    });

    it('handles CSV with extra unknown columns gracefully', async () => {
      const csv = [
        'Date,Description,Amount,ExtraCol1,ExtraCol2',
        '2025-05-01,Groceries,-45.00,ignored,data',
      ].join('\n');

      const result = await parser.parse(toBuffer(csv));

      expect(result).toHaveLength(1);
      expect(result[0]!.description).toBe('Groceries');
      expect(result[0]!.amount).toBe(45);
    });

    it('skips rows with missing description', async () => {
      const csv = ['Date,Description,Amount', '2025-01-01,,50.00', '2025-01-02,Valid,30.00'].join(
        '\n',
      );

      const result = await parser.parse(toBuffer(csv));

      expect(result).toHaveLength(1);
      expect(result[0]!.description).toBe('Valid');
    });

    it('skips rows with missing date', async () => {
      const csv = [
        'Date,Description,Amount',
        ',No Date Here,50.00',
        '2025-01-02,Has Date,30.00',
      ].join('\n');

      const result = await parser.parse(toBuffer(csv));

      expect(result).toHaveLength(1);
      expect(result[0]!.description).toBe('Has Date');
    });

    it('skips rows where amount is non-numeric text', async () => {
      const csv = [
        'Date,Description,Amount',
        '2025-01-01,Bad Amount,abc',
        '2025-01-02,Good Amount,25.00',
      ].join('\n');

      const result = await parser.parse(toBuffer(csv));

      expect(result).toHaveLength(1);
      expect(result[0]!.description).toBe('Good Amount');
    });
  });
});
