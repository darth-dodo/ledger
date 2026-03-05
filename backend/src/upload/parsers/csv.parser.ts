import { parse as csvParse } from 'csv-parse/sync';
import * as path from 'path';
import type { ParserInterface, ParsedTransaction } from './parser.interface.js';

/** Header aliases for column detection (all lowercase). */
const DATE_HEADERS = ['date', 'transaction date', 'posting date', 'txn date', 'value date'];
const DESC_HEADERS = ['description', 'details', 'narration', 'particulars', 'remarks', 'memo'];
const AMOUNT_HEADERS = ['amount'];
const DEBIT_HEADERS = ['debit', 'withdrawal', 'dr'];
const CREDIT_HEADERS = ['credit', 'deposit', 'cr'];

/**
 * Parses CSV bank statements with automatic column detection.
 * Handles both single-amount and separate debit/credit column patterns.
 */
export class CsvParser implements ParserInterface {
  canParse(_buffer: Buffer, filename: string): boolean {
    return path.extname(filename).toLowerCase() === '.csv';
  }

  async parse(buffer: Buffer): Promise<ParsedTransaction[]> {
    const content = buffer.toString('utf-8');
    const records: Record<string, string>[] = csvParse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });

    if (records.length === 0) return [];

    const firstRecord = records[0];
    if (!firstRecord) return [];
    const headers = Object.keys(firstRecord);
    const mapping = this.detectColumns(headers);

    if (!mapping.date || !mapping.description) return [];
    if (!mapping.amount && !mapping.debit && !mapping.credit) return [];

    const transactions: ParsedTransaction[] = [];

    for (const row of records) {
      const parsed = this.parseRow(row, mapping);
      if (parsed) transactions.push(parsed);
    }

    return transactions;
  }

  private detectColumns(headers: string[]): ColumnMapping {
    const mapping: ColumnMapping = {
      date: null,
      description: null,
      amount: null,
      debit: null,
      credit: null,
    };

    for (const header of headers) {
      const normalized = header.toLowerCase().trim();

      if (!mapping.date && DATE_HEADERS.includes(normalized)) {
        mapping.date = header;
      }
      if (!mapping.description && DESC_HEADERS.includes(normalized)) {
        mapping.description = header;
      }
      if (!mapping.amount && AMOUNT_HEADERS.includes(normalized)) {
        mapping.amount = header;
      }
      if (!mapping.debit && DEBIT_HEADERS.includes(normalized)) {
        mapping.debit = header;
      }
      if (!mapping.credit && CREDIT_HEADERS.includes(normalized)) {
        mapping.credit = header;
      }
    }

    return mapping;
  }

  private parseRow(row: Record<string, string>, mapping: ColumnMapping): ParsedTransaction | null {
    const rawDate = row[mapping.date!]?.trim();
    if (!rawDate) return null;

    const date = this.parseDate(rawDate);
    if (!date) return null;

    const description = row[mapping.description!]?.trim();
    if (!description) return null;

    let amount: number;
    let type: 'debit' | 'credit';

    if (mapping.amount) {
      // Single amount column: negative = debit, positive = credit
      const rawAmount = this.parseAmount(row[mapping.amount]);
      if (rawAmount === null) return null;
      type = rawAmount < 0 ? 'debit' : 'credit';
      amount = Math.abs(rawAmount);
    } else {
      // Separate debit/credit columns
      const debitVal = mapping.debit ? this.parseAmount(row[mapping.debit]) : null;
      const creditVal = mapping.credit ? this.parseAmount(row[mapping.credit]) : null;

      if (debitVal !== null && debitVal !== 0) {
        type = 'debit';
        amount = Math.abs(debitVal);
      } else if (creditVal !== null && creditVal !== 0) {
        type = 'credit';
        amount = Math.abs(creditVal);
      } else {
        return null;
      }
    }

    if (amount === 0) return null;

    return { date, description, amount, type };
  }

  private parseAmount(raw: string | undefined): number | null {
    if (!raw) return null;
    const cleaned = raw.replace(/[,$\s]/g, '').trim();
    if (!cleaned) return null;
    const value = parseFloat(cleaned);
    return isNaN(value) ? null : value;
  }

  private parseDate(raw: string): Date | null {
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const d = new Date(raw + 'T00:00:00');
      return isNaN(d.getTime()) ? null : d;
    }

    // DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
      const [day, month, year] = raw.split('/');
      const d = new Date(`${year}-${month}-${day}T00:00:00`);
      return isNaN(d.getTime()) ? null : d;
    }

    // DD-MM-YYYY
    if (/^\d{2}-\d{2}-\d{4}$/.test(raw)) {
      const [day, month, year] = raw.split('-');
      const d = new Date(`${year}-${month}-${day}T00:00:00`);
      return isNaN(d.getTime()) ? null : d;
    }

    // MM/DD/YYYY (US format fallback)
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw)) {
      const d = new Date(raw);
      return isNaN(d.getTime()) ? null : d;
    }

    // DD MMM YYYY
    if (/^\d{1,2}\s+[A-Za-z]{3}\s+\d{4}$/.test(raw)) {
      const d = new Date(raw);
      return isNaN(d.getTime()) ? null : d;
    }

    return null;
  }
}

interface ColumnMapping {
  date: string | null;
  description: string | null;
  amount: string | null;
  debit: string | null;
  credit: string | null;
}
