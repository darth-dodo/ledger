import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock pdf-parse before importing PdfParser so the module-level import resolves
// to our mock. The real PDFParse constructor returns an object with getText()
// and destroy() methods.
const mockGetText = vi.fn();
const mockDestroy = vi.fn();

vi.mock('pdf-parse', () => ({
  PDFParse: vi.fn().mockImplementation(() => ({
    getText: mockGetText,
    destroy: mockDestroy,
  })),
}));

import { PdfParser } from './pdf.parser.js';

describe('PdfParser', () => {
  const parser = new PdfParser();

  beforeEach(() => {
    vi.clearAllMocks();
    mockDestroy.mockResolvedValue(undefined);
  });

  // ---------------------------------------------------------------
  // canParse
  // ---------------------------------------------------------------
  describe('canParse', () => {
    it('returns true for .pdf extension', () => {
      expect(parser.canParse(Buffer.alloc(0), 'statement.pdf')).toBe(true);
    });

    it('returns true for .PDF extension (case-insensitive)', () => {
      expect(parser.canParse(Buffer.alloc(0), 'FILE.PDF')).toBe(true);
    });

    it('returns false for .csv extension', () => {
      expect(parser.canParse(Buffer.alloc(0), 'data.csv')).toBe(false);
    });

    it('returns false for .txt extension', () => {
      expect(parser.canParse(Buffer.alloc(0), 'file.txt')).toBe(false);
    });
  });

  // ---------------------------------------------------------------
  // parse — transaction extraction from text
  // ---------------------------------------------------------------
  describe('parse', () => {
    it('extracts transactions from lines with dates and amounts', async () => {
      mockGetText.mockResolvedValue({
        text: ['2025-06-15 Coffee Shop -4.50', '2025-06-16 Salary Deposit 3000.00'].join('\n'),
      });

      const result = await parser.parse(Buffer.from('fake-pdf'));

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

    it('handles DD/MM/YYYY date format', async () => {
      mockGetText.mockResolvedValue({
        text: '25/12/2025 Christmas Gift -50.00',
      });

      const result = await parser.parse(Buffer.from('fake-pdf'));

      expect(result).toHaveLength(1);
      expect(result[0]!.date).toEqual(new Date('2025-12-25T00:00:00'));
      expect(result[0]!.description).toBe('Christmas Gift');
    });

    it('handles DD-MM-YYYY date format', async () => {
      mockGetText.mockResolvedValue({
        text: '15-03-2025 Rent Payment -1200.00',
      });

      const result = await parser.parse(Buffer.from('fake-pdf'));

      expect(result).toHaveLength(1);
      expect(result[0]!.date).toEqual(new Date('2025-03-15T00:00:00'));
    });

    it('handles DD MMM YYYY date format', async () => {
      mockGetText.mockResolvedValue({
        text: '15 Jan 2025 Grocery Store -85.20',
      });

      const result = await parser.parse(Buffer.from('fake-pdf'));

      expect(result).toHaveLength(1);
      expect(result[0]!.description).toBe('Grocery Store');
      expect(result[0]!.amount).toBe(85.2);
    });

    it('skips lines without dates', async () => {
      mockGetText.mockResolvedValue({
        text: [
          'Account Summary',
          'Total Balance: 5000.00',
          '2025-06-15 Valid Transaction -25.00',
          'Footer information',
        ].join('\n'),
      });

      const result = await parser.parse(Buffer.from('fake-pdf'));

      expect(result).toHaveLength(1);
      expect(result[0]!.description).toBe('Valid Transaction');
    });

    it('skips lines without amounts', async () => {
      mockGetText.mockResolvedValue({
        text: ['2025-06-15 Transaction with no amount', '2025-06-16 Has Amount -10.00'].join('\n'),
      });

      const result = await parser.parse(Buffer.from('fake-pdf'));

      expect(result).toHaveLength(1);
      expect(result[0]!.description).toBe('Has Amount');
    });

    it('returns empty array for empty PDF text', async () => {
      mockGetText.mockResolvedValue({ text: '' });

      const result = await parser.parse(Buffer.from('fake-pdf'));

      expect(result).toEqual([]);
    });

    it('returns empty array when text has no transaction-like lines', async () => {
      mockGetText.mockResolvedValue({
        text: [
          'This is a bank statement header',
          'Account Number: 1234567890',
          'Thank you for banking with us',
        ].join('\n'),
      });

      const result = await parser.parse(Buffer.from('fake-pdf'));

      expect(result).toEqual([]);
    });

    it('treats negative amounts as debit and positive as credit', async () => {
      mockGetText.mockResolvedValue({
        text: ['2025-01-01 Withdrawal -500.00', '2025-01-02 Deposit 1000.00'].join('\n'),
      });

      const result = await parser.parse(Buffer.from('fake-pdf'));

      expect(result[0]!.type).toBe('debit');
      expect(result[0]!.amount).toBe(500);
      expect(result[1]!.type).toBe('credit');
      expect(result[1]!.amount).toBe(1000);
    });

    it('handles amounts with commas', async () => {
      mockGetText.mockResolvedValue({
        text: '2025-01-01 Large Purchase -1,250.99',
      });

      const result = await parser.parse(Buffer.from('fake-pdf'));

      expect(result).toHaveLength(1);
      expect(result[0]!.amount).toBe(1250.99);
    });

    it('uses the last amount on a line when multiple amounts appear', async () => {
      mockGetText.mockResolvedValue({
        text: '2025-01-01 Transfer Ref 100.00 Balance 500.00',
      });

      const result = await parser.parse(Buffer.from('fake-pdf'));

      // The parser takes the last amount match on the line
      expect(result).toHaveLength(1);
      expect(result[0]!.amount).toBe(500);
    });

    it('calls destroy on the PDFParse instance', async () => {
      mockGetText.mockResolvedValue({ text: '' });

      await parser.parse(Buffer.from('fake-pdf'));

      expect(mockDestroy).toHaveBeenCalledOnce();
    });
  });

  // ---------------------------------------------------------------
  // parse — multi-line format (e.g. description on one line,
  //         date on the next, amount on the next)
  // ---------------------------------------------------------------
  describe('parse (multi-line format)', () => {
    it('extracts transactions when amount is on a separate line from date', async () => {
      mockGetText.mockResolvedValue({
        text: [
          'EUR statement',
          'Description Incoming Outgoing Amount',
          'Card transaction of 24.45 EUR issued by FoodDelivery Downtown',
          '28 February 2025 Card ending in 9999 John Doe Transaction: CARD-123',
          '-24.45 101.54',
        ].join('\n'),
      });

      const result = await parser.parse(Buffer.from('fake-pdf'));

      expect(result).toHaveLength(1);
      expect(result[0]!.description).toBe('FoodDelivery Downtown');
      expect(result[0]!.amount).toBe(24.45);
      expect(result[0]!.type).toBe('debit');
      expect(result[0]!.date).toEqual(new Date('2025-02-28T00:00:00'));
    });

    it('extracts "Paid to" transactions', async () => {
      mockGetText.mockResolvedValue({
        text: [
          'Paid to Acme Insurance Corp',
          '27 February 2025 Transaction: DIRECT_DEBIT-123 Reference: Monthly premium',
          '-81.46 237.31',
        ].join('\n'),
      });

      const result = await parser.parse(Buffer.from('fake-pdf'));

      expect(result).toHaveLength(1);
      expect(result[0]!.description).toBe('Acme Insurance Corp');
      expect(result[0]!.amount).toBe(81.46);
      expect(result[0]!.type).toBe('debit');
    });

    it('extracts "Sent money to" transactions', async () => {
      mockGetText.mockResolvedValue({
        text: [
          'Sent money to Jane Smith',
          '26 February 2025 Transaction: TRANSFER-123 Reference: Rent',
          '-1,590.00 375.56',
        ].join('\n'),
      });

      const result = await parser.parse(Buffer.from('fake-pdf'));

      expect(result).toHaveLength(1);
      expect(result[0]!.description).toBe('Jane Smith');
      expect(result[0]!.amount).toBe(1590.0);
      expect(result[0]!.type).toBe('debit');
    });

    it('extracts "Received money from" with reference', async () => {
      mockGetText.mockResolvedValue({
        text: [
          'Received money from Globex Corp with reference Salary Payment 02/2025',
          '25 February 2025 Transaction: TRANSFER-456',
          '4,818.71 5,214.86',
        ].join('\n'),
      });

      const result = await parser.parse(Buffer.from('fake-pdf'));

      expect(result).toHaveLength(1);
      expect(result[0]!.description).toBe('Globex Corp - Salary Payment 02/2025');
      expect(result[0]!.amount).toBe(4818.71);
      expect(result[0]!.type).toBe('credit');
    });

    it('extracts multiple transactions from a multi-line statement', async () => {
      mockGetText.mockResolvedValue({
        text: [
          'Description Incoming Outgoing Amount',
          'Card transaction of 24.45 EUR issued by FoodDelivery Downtown',
          '28 February 2025 Card ending in 9999',
          '-24.45 101.54',
          'Card transaction of 10.99 EUR issued by StreamingService Plus',
          '27 February 2025 Card ending in 9999',
          '-10.99 152.83',
        ].join('\n'),
      });

      const result = await parser.parse(Buffer.from('fake-pdf'));

      expect(result).toHaveLength(2);
      expect(result[0]!.description).toBe('FoodDelivery Downtown');
      expect(result[1]!.description).toBe('StreamingService Plus');
    });

    it('prefers single-line format when it produces results', async () => {
      mockGetText.mockResolvedValue({
        text: [
          '2025-06-15 Coffee Shop -4.50',
          '2025-06-16 Salary 3000.00',
        ].join('\n'),
      });

      const result = await parser.parse(Buffer.from('fake-pdf'));

      // Should use single-line parser, not multi-line
      expect(result).toHaveLength(2);
      expect(result[0]!.description).toBe('Coffee Shop');
    });
  });
});
