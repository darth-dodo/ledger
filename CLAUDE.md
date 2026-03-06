Default to using Node.js with pnpm.

- Use `pnpm install` for installing dependencies
- Use `pnpm run <script>` or `pnpm <script>` to run scripts
- Use `tsx <file>` to run TypeScript files directly
- Use `vitest` for testing (`pnpm test` runs `vitest run`)
- Use `dotenv/config` to load .env files (import at entry point)

## Backend (NestJS)

- Runtime: Node.js with tsx for TypeScript execution
- Package manager: pnpm
- Test runner: vitest
- `pnpm dev` — start dev server with watch mode (tsx watch)
- `pnpm test` — run tests (vitest)
- `pnpm build` — type-check (tsc --noEmit)

## Frontend (Angular)

- Package manager: pnpm
- `pnpm dev` — start Angular dev server (ng serve)
- `pnpm build` — production build (ng build)
- `pnpm test` — run tests (ng test)

## M3 Modules (Parse & Persist)

### Transactions module (`backend/src/transactions/`)

- `GET /transactions` — list with filters (statementId, date range, category, amount range, type)
- `PATCH /transactions/:id` — update category or description
- Transactions are created automatically during upload (via parser pipeline)

### Mistral module (`backend/src/mistral/`)

- Wraps `@mistralai/mistralai` SDK
- Batch-categorizes transaction descriptions in a single API call
- Requires `MISTRAL_API_KEY` in `.env`; categorization gracefully skips if key is absent

### Parser strategy (`backend/src/upload/parsers/`)

- `ParserInterface` with `canParse(buffer, filename)` and `parse(buffer)` methods
- `PdfParser` — extracts text via `pdf-parse`, heuristic transaction detection
- `CsvParser` — parses via `csv-parse`, heuristic column detection
- Parsers registered in `upload.module.ts` via `PARSERS` multi-provider token
- See `docs/adrs/adr-002-parser-strategy.md` for design decisions
