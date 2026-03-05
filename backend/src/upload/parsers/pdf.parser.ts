import { PDFParse } from 'pdf-parse';
import * as path from 'path';
import type { ParserInterface, ParsedTransaction } from './parser.interface.js';

/**
 * Parses PDF bank statements by extracting text via pdf-parse v2,
 * then using regex to find transaction patterns in the extracted text.
 */
export class PdfParser implements ParserInterface {
  canParse(_buffer: Buffer, filename: string): boolean {
    return path.extname(filename).toLowerCase() === '.pdf';
  }

  async parse(buffer: Buffer): Promise<ParsedTransaction[]> {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    const text = result.text;
    await parser.destroy();
    return this.extractTransactions(text);
  }

  private extractTransactions(text: string): ParsedTransaction[] {
    const transactions: ParsedTransaction[] = [];
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

    // Date patterns:
    // DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, DD MMM YYYY
    const datePatterns = [
      /(\d{2}\/\d{2}\/\d{4})/,        // DD/MM/YYYY
      /(\d{2}-\d{2}-\d{4})/,           // DD-MM-YYYY
      /(\d{4}-\d{2}-\d{2})/,           // YYYY-MM-DD
      /(\d{2}\s+[A-Za-z]{3}\s+\d{4})/, // DD MMM YYYY
    ];

    // Amount pattern: optional negative/minus, digits with optional commas, decimal
    const amountPattern = /(-?\s*[\d,]+\.\d{2})/;

    for (const line of lines) {
      let dateStr: string | null = null;
      let dateMatch: RegExpMatchArray | null = null;

      for (const pattern of datePatterns) {
        dateMatch = line.match(pattern);
        if (dateMatch) {
          dateStr = dateMatch[1]?.trim() ?? null;
          break;
        }
      }

      if (!dateStr || !dateMatch) continue;

      // Find the amount (search from the end of the line for the last match)
      const amountMatches = [...line.matchAll(new RegExp(amountPattern, 'g'))];
      if (amountMatches.length === 0) continue;

      const lastAmountMatch = amountMatches[amountMatches.length - 1]!;
      const captured = lastAmountMatch[1];
      if (!captured) continue;

      const rawAmount = captured.replace(/\s/g, '').replace(/,/g, '');
      const numericAmount = parseFloat(rawAmount);

      if (isNaN(numericAmount)) continue;

      // Extract description: text between date and amount
      const dateEnd = (dateMatch.index ?? 0) + dateMatch[0].length;
      const amountStart = lastAmountMatch.index ?? dateEnd;

      let description = line.substring(dateEnd, amountStart).trim();
      // Clean up separators and extra whitespace
      description = description.replace(/^[\s|,\-:]+/, '').replace(/[\s|,\-:]+$/, '').trim();

      if (!description) continue;

      const parsedDate = this.parseDate(dateStr);
      if (!parsedDate) continue;

      const type: 'debit' | 'credit' = numericAmount < 0 ? 'debit' : 'credit';
      const amount = Math.abs(numericAmount);

      transactions.push({ date: parsedDate, description, amount, type });
    }

    return transactions;
  }

  private parseDate(dateStr: string): Date | null {
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const d = new Date(dateStr + 'T00:00:00');
      return isNaN(d.getTime()) ? null : d;
    }

    // DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      const [day, month, year] = dateStr.split('/');
      const d = new Date(`${year}-${month}-${day}T00:00:00`);
      return isNaN(d.getTime()) ? null : d;
    }

    // DD-MM-YYYY
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
      const [day, month, year] = dateStr.split('-');
      const d = new Date(`${year}-${month}-${day}T00:00:00`);
      return isNaN(d.getTime()) ? null : d;
    }

    // DD MMM YYYY
    if (/^\d{2}\s+[A-Za-z]{3}\s+\d{4}$/.test(dateStr)) {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? null : d;
    }

    return null;
  }
}
