# ADR-002: Parser Strategy Pattern

**Status**: Accepted
**Date**: 2026-03-05
**Milestone**: M3 — Parse & Persist

---

## Context

Ledger needs to extract structured transactions from uploaded PDF and CSV bank statements. Bank statement formats vary significantly across institutions — PDF layouts differ, CSV column names are non-standard, and some banks use unique formatting conventions.

Key constraints:

- Must support PDF and CSV formats at minimum
- Bank-specific formats will need custom parsers over time
- Parsing happens synchronously during the upload flow (bank statements are small, <5MB)
- Parsed transactions need: date, description, amount, type (debit/credit)
- The Statement entity already has a nullable `raw_text` column ready for parsed content

---

## Decisions

### 1. Strategy Pattern: ParserInterface

**Choice**: Define a `ParserInterface` with two methods that all parsers implement.

```typescript
interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
}

interface ParserInterface {
  canParse(buffer: Buffer, filename: string): boolean;
  parse(buffer: Buffer): Promise<ParsedTransaction[]>;
}
```

**Rationale**: The strategy pattern lets `UploadService` iterate through registered parsers without knowing their internals. Adding a new bank format means implementing the interface and registering it — zero changes to existing code.

**`canParse()` detection order**: Parsers are checked in registration order. More specific parsers (bank-specific) should be registered before generic ones so they get priority.

### 2. Generic Parsers First

**Choice**: Start with two generic parsers:

- **PdfParser**: Uses `pdf-parse` to extract text, then applies regex/heuristic patterns to identify transaction rows (date + description + amount patterns).
- **CsvParser**: Uses `csv-parse` to parse rows, then applies heuristic column detection to map columns to transaction fields.

**Alternatives considered**:

- **Bank-specific parsers only**: Would provide better accuracy but requires samples from each bank upfront. Not practical for MVP.
- **AI-powered extraction**: Use Mistral to extract transactions from raw text. More flexible but slower, expensive, and harder to test deterministically.

**Rationale**: Generic parsers handle the 80% case. Bank-specific parsers can be added later when specific formats don't parse cleanly. The strategy pattern makes this a non-breaking addition.

### 3. CSV Column Detection Heuristics

**Choice**: Detect CSV columns by header name patterns rather than fixed positions.

| Field | Header patterns |
|-------|----------------|
| date | `date`, `transaction date`, `posting date`, `txn date`, `value date` |
| description | `description`, `details`, `narration`, `particulars`, `remarks`, `memo` |
| amount | `amount`, `debit`, `credit`, `withdrawal`, `deposit`, `dr`, `cr` |

**Separate debit/credit columns**: Some banks use separate columns for debits and credits instead of a single amount. Detect both patterns:
- Single `amount` column + `type` indicator
- Separate `debit`/`withdrawal` and `credit`/`deposit` columns

**Rationale**: Indian and international banks use wildly different CSV headers. Heuristic matching handles the variance without bank-specific configuration.

### 4. Synchronous Parsing in Upload Flow

**Choice**: Parse files synchronously within the `POST /upload` request.

**Alternatives considered**:

- **Background job queue**: Better for large files but adds complexity (Bull/Redis). Bank statements are typically <5MB and parse in <1s.
- **Separate parse endpoint**: Requires the user to trigger parsing manually. Worse UX.

**Rationale**: Bank statements are small enough that synchronous parsing doesn't impact response times. The upload endpoint becomes: store file → parse → categorize → persist. If parsing becomes slow for specific banks, we can add async processing later.

### 5. Idempotency: Delete-and-Reparse

**Choice**: When re-uploading a file for an existing statement, delete existing transactions for that `statement_id` and re-parse.

**Alternatives considered**:

- **Skip if raw_text populated**: Simpler but prevents re-parsing when parser logic improves.
- **File hash deduplication**: Reject identical files. Too strict — user might want to re-process with updated parsers.
- **Transaction-level dedup**: Compare individual transactions. Complex and fragile.

**Rationale**: Delete-and-reparse is the simplest approach that handles the case where parser logic improves and the user wants fresh results. The `ON DELETE CASCADE` on transactions makes cleanup automatic when a statement is deleted.

### 6. ParsedTransaction Shape

**Choice**: Parsers return a flat array of `ParsedTransaction` objects without category assignment.

```typescript
interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number;          // always positive
  type: 'debit' | 'credit';
}
```

**Amount convention**: Always stored as a positive number. The `type` field distinguishes debits from credits. This avoids ambiguity with negative amounts.

**Category assignment**: Handled separately by the Mistral categorization step, not by parsers. This keeps parsers focused on extraction and testable without API dependencies.

### 7. Module Structure

```
backend/src/upload/parsers/
├── parser.interface.ts    # ParserInterface + ParsedTransaction type
├── pdf.parser.ts          # Generic PDF parser
└── csv.parser.ts          # Generic CSV parser
```

Parsers live inside the upload module since they're called by `UploadService.processFile()`. They're not a separate NestJS module — they're plain classes injected via a multi-provider token.

**Registration pattern**:
```typescript
// upload.module.ts
providers: [
  { provide: 'PARSERS', useFactory: () => [new CsvParser(), new PdfParser()] },
]
```

Generic parsers are registered last so bank-specific parsers (added later) get priority in the `canParse()` chain.

---

## Consequences

**Positive**:

- Adding new bank formats requires zero changes to existing code
- Generic parsers handle the common case immediately
- Synchronous flow keeps the codebase simple
- Category assignment is decoupled from parsing — testable independently
- Delete-and-reparse handles parser improvements gracefully

**Negative**:

- Generic PDF parsing may produce poor results for complex bank layouts (mitigated by adding bank-specific parsers)
- Synchronous parsing could slow uploads for very large files (unlikely with bank statements)
- Heuristic CSV column detection may fail on unusual formats (fallback: user re-uploads with a supported bank)

**Risks**:

- PDF tables without clear delimiters may not parse cleanly. Mitigation: the generic PDF parser extracts what it can; bank-specific parsers handle edge cases.
- `parse()` returning `Promise` allows for async operations in future parsers (e.g., API calls) without interface changes.

---

## References

- [docs/architecture.md](../architecture.md) — Section 9 (Parser Strategy Pattern)
- [docs/milestones/m3-parse-persist.md](../milestones/m3-parse-persist.md) — M3 Design Document
- [docs/adrs/adr-001-upload-strategy.md](adr-001-upload-strategy.md) — M2 upload decisions
