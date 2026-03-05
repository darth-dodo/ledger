export interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
}

export interface ParserInterface {
  canParse(buffer: Buffer, filename: string): boolean;
  parse(buffer: Buffer): Promise<ParsedTransaction[]>;
}
