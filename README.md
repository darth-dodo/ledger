# Ledger

> Your financial ledger. Ask anything.

Upload bank statements (PDF/CSV), automatically parse transactions, and interact with your financial data through natural language chat and visual analytics.

## Status

| Milestone         | Status |
| ----------------- | ------ |
| M0: Scaffold      | ✅     |
| M1: Health Check  | ✅     |
| M2: File Upload   | ✅     |
| M3: Parse         | ⏳     |
| M4: Embed         | ⏳     |
| M5: RAG Chat      | ⏳     |
| M6: Dashboard     | ⏳     |
| M7: Auth & Polish | ⏳     |

## Tech Stack

- **Frontend**: Angular 19 (TypeScript, standalone components)
- **Backend**: NestJS (TypeScript, TypeORM)
- **Database**: PostgreSQL + pgvector
- **AI**: Mistral (embeddings + chat)
- **Package Manager**: pnpm

## Quick Start

```bash
# Install dependencies
pnpm install

# Start PostgreSQL
docker compose up -d

# Start backend (port 3000)
cd backend && pnpm dev

# Start frontend (port 4200)
cd frontend && pnpm dev
```

## Development

```bash
# Run all tests
cd backend && pnpm test
cd frontend && pnpm test

# Type check
cd backend && pnpm build

# Lint
pnpm run lint

# Format
npx prettier --check .
```

## Project Structure

```
ledger/
├── backend/              # NestJS API
│   └── src/
│       ├── health/       # GET /health
│       └── upload/       # POST /upload, GET/DELETE /statements
├── frontend/             # Angular SPA
│   └── src/app/
│       ├── core/         # Services (ApiService)
│       ├── shared/       # Reusable components (FileDropzone)
│       └── features/     # Page components (Upload)
├── docs/
│   ├── architecture.md   # System design
│   ├── product.md        # Product spec
│   ├── adrs/             # Architecture decision records
│   └── milestones/       # Milestone docs, retros, handoffs
└── tasks.md              # Project board
```

## Documentation

- [Product Spec](docs/product.md)
- [Architecture](docs/architecture.md)
- [ADR-001: Upload Strategy](docs/adrs/adr-001-upload-strategy.md)
- [Project Board](tasks.md)
- [Changelog](CHANGELOG.md)
