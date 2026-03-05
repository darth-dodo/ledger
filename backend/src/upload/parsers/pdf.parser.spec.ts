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
        text: [
          '2025-06-15 Coffee Shop -4.50',
          '2025-06-16 Salary Deposit 3000.00',
        ].join('\n'),
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
        text: [
          '2025-06-15 Transaction with no amount',
          '2025-06-16 Has Amount -10.00',
        ].join('\n'),
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
        text: [
          '2025-01-01 Withdrawal -500.00',
          '2025-01-02 Deposit 1000.00',
        ].join('\n'),
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
});
