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
    // Try single-line extraction first, fall back to multi-line if nothing found
    const singleLine = this.extractSingleLine(text);
    if (singleLine.length > 0) return singleLine;

    return this.extractMultiLine(text);
  }

  /**
   * Original single-line strategy: each line has date + description + amount.
   * Works for formats like: "2025-06-15 Coffee Shop -4.50"
   */
  private extractSingleLine(text: string): ParsedTransaction[] {
    const transactions: ParsedTransaction[] = [];
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    for (const line of lines) {
      const result = this.parseSingleLine(line);
      if (result) transactions.push(result);
    }

    return transactions;
  }

  /**
   * Multi-line strategy for bank statements where transactions span multiple lines:
   * Line N:   "Card transaction of 24.45 EUR issued by Coffee Shop"  (description)
   * Line N+1: "28 February 2025 Card ending in 9999 ..."             (date + metadata)
   * Line N+2: "-24.45 101.54"                                        (amount + balance)
   *
   * The amount may be on the date line itself or on the next line.
   */
  private extractMultiLine(text: string): ParsedTransaction[] {
    const transactions: ParsedTransaction[] = [];
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;

      // Look for a line that starts with a date
      const dateInfo = this.findDate(line);
      if (!dateInfo) continue;

      // Find amounts — either on this line or the next line
      let amountMatches = [...line.matchAll(/(-?\s*[\d,]+\.\d{2})/g)];
      let amountLineIdx = i;

      // If no amount on the date line, check the next line
      if (amountMatches.length === 0 && i + 1 < lines.length) {
        const nextLine = lines[i + 1]!;
        amountMatches = [...nextLine.matchAll(/(-?\s*[\d,]+\.\d{2})/g)];
        if (amountMatches.length > 0) {
          amountLineIdx = i + 1;
        }
      }

      if (amountMatches.length === 0) continue;

      // Use the FIRST amount (the transaction amount), not the last (running balance)
      const captured = amountMatches[0]![1];
      if (!captured) continue;

      const rawAmount = captured.replace(/\s/g, '').replace(/,/g, '');
      const numericAmount = parseFloat(rawAmount);
      if (isNaN(numericAmount)) continue;

      const parsedDate = this.parseDate(dateInfo.dateStr);
      if (!parsedDate) continue;

      // The description is on the line(s) before the date line
      let description = '';
      for (let j = i - 1; j >= 0; j--) {
        const prevLine = lines[j]!;
        // Stop if we hit a line that's just amounts (belongs to previous transaction)
        if (/^-?[\d,.\s]+$/.test(prevLine)) break;
        // Stop if we hit another date line (belongs to previous transaction)
        if (this.findDate(prevLine)) break;
        // Skip page markers and headers
        if (
          /^(ref:|--\s*\d|Description|IBAN|Swift|EUR\s+(on|statement)|Generated|Account\s+Holder)/i.test(
            prevLine,
          )
        )
          break;

        description = prevLine;
        break;
      }

      if (!description) continue;

      // Clean up multi-line descriptions to extract merchant/payee
      let cleanDesc = description;
      const issuedByMatch = description.match(/issued by\s+(.+)/i);
      const paidToMatch = description.match(/^(?:Paid|Sent money) to\s+(.+)/i);
      const receivedFromMatch = description.match(
        /^Received money from\s+(.+?)(?:\s+with reference\s+(.+))?$/i,
      );
      const movedMatch = description.match(/^Moved\s+[\d,.]+\s+\w+\s+(to|from)\s+(.+)/i);

      if (receivedFromMatch) {
        cleanDesc = receivedFromMatch[2]
          ? `${receivedFromMatch[1]} - ${receivedFromMatch[2]}`
          : receivedFromMatch[1]!;
      } else if (paidToMatch) {
        cleanDesc = paidToMatch[1]!;
      } else if (issuedByMatch) {
        cleanDesc = issuedByMatch[1]!;
      } else if (movedMatch) {
        cleanDesc = `${movedMatch[2]} (${movedMatch[1]})`;
      }

      cleanDesc = cleanDesc.trim();
      if (!cleanDesc) continue;

      const type: 'debit' | 'credit' = numericAmount < 0 ? 'debit' : 'credit';
      const amount = Math.abs(numericAmount);

      transactions.push({ date: parsedDate, description: cleanDesc, amount, type });

      // Skip past the amount line to avoid re-processing
      i = amountLineIdx;
    }

    return transactions;
  }

  private parseSingleLine(line: string): ParsedTransaction | null {
    const dateInfo = this.findDate(line);
    if (!dateInfo) return null;

    const amountMatches = [...line.matchAll(/(-?\s*[\d,]+\.\d{2})/g)];
    if (amountMatches.length === 0) return null;

    const lastAmountMatch = amountMatches[amountMatches.length - 1]!;
    const captured = lastAmountMatch[1];
    if (!captured) return null;

    const rawAmount = captured.replace(/\s/g, '').replace(/,/g, '');
    const numericAmount = parseFloat(rawAmount);
    if (isNaN(numericAmount)) return null;

    const dateEnd = (dateInfo.match.index ?? 0) + dateInfo.match[0].length;
    const amountStart = lastAmountMatch.index ?? dateEnd;

    let description = line.substring(dateEnd, amountStart).trim();
    description = description
      .replace(/^[\s|,\-:]+/, '')
      .replace(/[\s|,\-:]+$/, '')
      .trim();

    if (!description) return null;

    const parsedDate = this.parseDate(dateInfo.dateStr);
    if (!parsedDate) return null;

    const type: 'debit' | 'credit' = numericAmount < 0 ? 'debit' : 'credit';
    const amount = Math.abs(numericAmount);

    return { date: parsedDate, description, amount, type };
  }

  private findDate(line: string): { dateStr: string; match: RegExpMatchArray } | null {
    const datePatterns = [
      /(\d{2}\/\d{2}\/\d{4})/,
      /(\d{2}-\d{2}-\d{4})/,
      /(\d{4}-\d{2}-\d{2})/,
      /(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})/,
    ];

    for (const pattern of datePatterns) {
      const match = line.match(pattern);
      if (match) {
        const dateStr = match[1]?.trim() ?? null;
        if (dateStr && this.parseDate(dateStr)) {
          return { dateStr, match };
        }
      }
    }
    return null;
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

    // DD MMM YYYY or DD Month YYYY (e.g. "15 Jan 2025" or "28 February 2026")
    if (/^\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}$/.test(dateStr)) {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? null : d;
    }

    return null;
  }
}
