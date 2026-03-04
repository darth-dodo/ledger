# Ledger — Project Board

> Persistent task tracker across sessions. Updated by each session's agent.

---

## Progress Dashboard

| Metric                | Value                      |
| --------------------- | -------------------------- |
| **Current Milestone** | M0 — Monorepo Scaffold 🔄  |
| **Overall Progress**  | 1/8 milestones in progress |
| **Active Blockers**   | 0                          |
| **Quality Gates**     | ➖ Not yet applicable      |
| **Last Updated**      | 2026-03-04                 |

---

## Milestone Matrix

| #   | Milestone         | Status | Pattern      | Personas                       | Duration | Depends On |
| --- | ----------------- | ------ | ------------ | ------------------------------ | -------- | ---------- |
| M0  | Monorepo Scaffold | 🔄     | Single agent | Developer                      | 1d       | —          |
| M1  | Health Check      | ⏳     | Single agent | Developer                      | 1d       | M0         |
| M2  | File Upload       | ⏳     | Sequential   | Architect → Developer          | 2d       | M1         |
| M3  | Parse & Persist   | ⏳     | Sequential   | Architect → Developer → QA     | 3d       | M2         |
| M4  | Chunk & Embed     | ⏳     | Sequential   | Architect → Developer + AI     | 2d       | M3         |
| M5  | RAG Chat          | ⏳     | Hierarchical | Architect leads, Dev + AI      | 3d       | M4         |
| M6  | Full Dashboard    | ⏳     | Parallel     | Dev (backend) + Dev (frontend) | 3d       | M5         |
| M7  | Auth & Polish     | ⏳     | Parallel     | Dev + QA + Writer              | 2d       | M6         |

**Legend**: ✅ Complete | 🔄 In Progress | ⏳ Pending | 🚫 Blocked

---

## Dependency Graph

```mermaid
graph LR
    M0[M0: Scaffold] --> M1[M1: Health Check]
    M1 --> M2[M2: File Upload]
    M2 --> M3[M3: Parse & Persist]
    M3 --> M4[M4: Chunk & Embed]
    M4 --> M5[M5: RAG Chat]
    M5 --> M6[M6: Full Dashboard]
    M6 --> M7[M7: Auth & Polish]

    style M0 fill:#fff3cd,stroke:#856404
    style M1 fill:#f5f5f5,stroke:#999
    style M2 fill:#f5f5f5,stroke:#999
    style M3 fill:#f5f5f5,stroke:#999
    style M4 fill:#f5f5f5,stroke:#999
    style M5 fill:#f5f5f5,stroke:#999
    style M6 fill:#f5f5f5,stroke:#999
    style M7 fill:#f5f5f5,stroke:#999
```

---

## Per-Milestone Task Breakdown

### M0 — Monorepo Scaffold 🔄

- [x] Initialize project with `package.json`
- [x] Configure `.gitignore` for NestJS + Angular
- [x] Set up GitHub Actions CI (lint, test, build)
- [x] Add placeholder scripts for CI compatibility
- [x] Add pre-commit hooks for code quality gates
- [x] Write product document (`docs/product.md`)
- [x] Write architecture document (`docs/architecture.md`)
- [x] Set up agentic framework with personas, workflows, quality gates
- [ ] Create monorepo workspace structure (`backend/`, `frontend/`)
- [ ] Add `tsconfig.json` (root + per-workspace)
- [ ] Configure ESLint + Prettier
- [ ] Scaffold NestJS backend (`backend/src/app.module.ts`)
- [ ] Scaffold Angular frontend (`frontend/src/app/`)
- [ ] Add `docker-compose.yml` for PostgreSQL + pgvector
- [ ] Verify `pnpm install` + `pnpm run build` works end-to-end

**Acceptance Criteria**:

- [ ] `pnpm install` succeeds in root
- [ ] `pnpm run build` passes (even if builds are empty shells)
- [ ] `pnpm test` runs (even if no tests yet)
- [ ] CI passes on push
- [ ] Both `backend/` and `frontend/` directories exist with starter code

---

### M1 — Health Check ⏳

- [ ] Create NestJS health module with `GET /health` endpoint
- [ ] Return `{ status: "ok", timestamp, uptime }`
- [ ] Add health check integration test (`pnpm test`)
- [ ] Verify endpoint works with `curl`
- [ ] Add smoke test to CI pipeline

**Acceptance Criteria**:

- [ ] `curl http://localhost:3000/health` returns 200 with JSON
- [ ] Integration test passes
- [ ] CI green

---

### M2 — File Upload ⏳

- [ ] Design upload strategy (ADR)
- [ ] Create Upload module (controller, service)
- [ ] Implement `POST /upload` with Multer for file handling
- [ ] Validate file type (PDF/CSV only) and size (< 10MB)
- [ ] Store uploaded file metadata in `statements` table
- [ ] Create `GET /statements` and `GET /statements/:id` endpoints
- [ ] Create `DELETE /statements/:id` endpoint
- [ ] Add Angular upload page with drag-and-drop `FileDropzone` component
- [ ] Write unit tests for upload validation
- [ ] Write integration test for full upload flow

**Acceptance Criteria**:

- [ ] PDF and CSV files upload successfully
- [ ] Invalid files are rejected with clear error
- [ ] Statements are persisted in database
- [ ] Frontend drag-and-drop works
- [ ] Quality gates pass

---

### M3 — Parse & Persist ⏳

- [ ] Design parser strategy pattern (ADR)
- [ ] Create `ParserInterface` with `canParse()` and `parse()` methods
- [ ] Implement generic PDF parser (`pdf-parse`)
- [ ] Implement generic CSV parser (`csv-parse`)
- [ ] Extract transactions: date, description, amount, type
- [ ] AI category assignment via Mistral
- [ ] Store transactions in `transactions` table
- [ ] Create `GET /transactions` with filters (date, category, amount)
- [ ] Create `PATCH /transactions/:id` for category edits
- [ ] Add Angular transactions view with filterable table
- [ ] Write unit tests per parser (happy path + malformed input)
- [ ] Write integration test for full parse pipeline
- [ ] Test idempotency (re-upload same file)

**Acceptance Criteria**:

- [ ] PDF and CSV statements produce correct transactions
- [ ] Each transaction has: date, description, amount, type, category
- [ ] Transactions are viewable and filterable in frontend
- [ ] Duplicate uploads don't create duplicate records
- [ ] Quality gates pass

---

### M4 — Chunk & Embed ⏳

**Overlay**: ai-engineer

- [ ] Design embedding strategy (ADR)
- [ ] Implement `ChunkerService` (~500 token chunks with overlap)
- [ ] Integrate Mistral Embed API (1024-dim vectors)
- [ ] Store chunks + embeddings in `embeddings` table with pgvector
- [ ] Create IVFFlat index for cosine similarity search
- [ ] Wire chunking + embedding into upload pipeline (post-parse)
- [ ] Write unit tests for chunker (boundary cases, overlap)
- [ ] Write integration test: upload → parse → chunk → embed → verify vectors
- [ ] Validate embedding dimensions = 1024

**Acceptance Criteria**:

- [ ] Statement text is chunked into ~500 token segments
- [ ] Each chunk has a 1024-dim embedding stored in pgvector
- [ ] Cosine similarity search returns relevant chunks
- [ ] Pipeline runs end-to-end on upload
- [ ] Quality gates pass

---

### M5 — RAG Chat ⏳

**Overlay**: ai-engineer

- [ ] Design RAG pipeline (ADR)
- [ ] Create RAG module (controller, service)
- [ ] Implement query embedding (user question → vector)
- [ ] Implement vector similarity search (top 5 chunks)
- [ ] Build prompt template (system + context + query)
- [ ] Integrate Mistral Chat API for response generation
- [ ] Return response with source attribution (chunk IDs)
- [ ] Store chat messages in `chat_messages` table
- [ ] Create `GET /chat/history` endpoint
- [ ] Add Angular chat page (MessageInput, MessageBubble, SourceCard)
- [ ] Write integration test for full RAG pipeline
- [ ] Test with example queries from product doc

**Acceptance Criteria**:

- [ ] User can ask natural language questions about their finances
- [ ] Responses cite specific transactions/chunks as sources
- [ ] Chat history is persisted
- [ ] Source cards show which data informed each answer
- [ ] Quality gates pass

---

### M6 — Full Dashboard ⏳

**Track A — Backend API**:

- [ ] Create Analytics module (controller, service)
- [ ] `GET /analytics/summary` — total in/out, top categories, savings rate
- [ ] `GET /analytics/categories` — spending by category
- [ ] `GET /analytics/monthly` — month-over-month breakdown
- [ ] `GET /analytics/daily` — daily spending data for heatmap
- [ ] Write unit tests for analytics calculations

**Track B — Frontend Dashboard**:

- [ ] StatCards component (total spent, income, savings rate)
- [ ] CategoryBreakdown component (pie chart + bar chart)
- [ ] MonthlyTrends component (line chart)
- [ ] DailyHeatmap component (calendar view)
- [ ] Wire components to analytics API
- [ ] Responsive layout

**Acceptance Criteria**:

- [ ] Dashboard shows summary stats, category breakdown, trends, heatmap
- [ ] Charts render correctly with real transaction data
- [ ] Responsive on mobile and desktop
- [ ] Quality gates pass (including accessibility)

---

### M7 — Auth & Polish ⏳

**Track A — Authentication**:

- [ ] Implement JWT-based login/register
- [ ] Add auth guards to all endpoints
- [ ] Login/register pages in Angular

**Track B — Error Handling**:

- [ ] Consistent error states across all pages
- [ ] API error interceptor in Angular
- [ ] NestJS exception filters

**Track C — Documentation**:

- [ ] API documentation
- [ ] User guide
- [ ] Deployment guide

**Acceptance Criteria**:

- [ ] Users can register, login, and access their own data
- [ ] Errors are handled gracefully everywhere
- [ ] Documentation is complete
- [ ] All 8 quality gates pass

---

## Quality Gate Tracker

| Milestone | Syntax | Types | Lint | Security | Tests | Perf | A11y | Integration |
| --------- | ------ | ----- | ---- | -------- | ----- | ---- | ---- | ----------- |
| M0        | ➖     | ➖    | ➖   | ➖       | ➖    | ➖   | ➖   | ➖          |
| M1        | ⏳     | ⏳    | ⏳   | ⏳       | ⏳    | ⏳   | ➖   | ⏳          |
| M2        | ⏳     | ⏳    | ⏳   | ⏳       | ⏳    | ⏳   | ⏳   | ⏳          |
| M3        | ⏳     | ⏳    | ⏳   | ⏳       | ⏳    | ⏳   | ⏳   | ⏳          |
| M4        | ⏳     | ⏳    | ⏳   | ⏳       | ⏳    | ⏳   | ➖   | ⏳          |
| M5        | ⏳     | ⏳    | ⏳   | ⏳       | ⏳    | ⏳   | ⏳   | ⏳          |
| M6        | ⏳     | ⏳    | ⏳   | ⏳       | ⏳    | ⏳   | ⏳   | ⏳          |
| M7        | ⏳     | ⏳    | ⏳   | ⏳       | ⏳    | ⏳   | ⏳   | ⏳          |

**Legend**: ✅ Passed | ❌ Failed | ⚠️ Warning | ⏳ Pending | ➖ N/A

**Commands**:

```bash
pnpm run build                   # Gates 1+2 (tsc --noEmit)
pnpm run lint                    # Gate 3
pnpm test                        # Gate 5 (vitest)

```

---

## Blockers Register

| #   | Blocker | Severity | Milestone | Impact | Resolution | Status |
| --- | ------- | -------- | --------- | ------ | ---------- | ------ |
|     | _None_  |          |           |        |            |        |

**Severity**: 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low

---

## Session Log Archive

| #   | Date       | Milestone | Persona(s)      | Focus                                      | Outcome              |
| --- | ---------- | --------- | --------------- | ------------------------------------------ | -------------------- |
| 1   | 2026-03-04 | M0        | Architect + Dev | Project setup, CI, docs, agentic framework | Scaffold in progress |

---

## Memory State

Current Serena memory key values for cross-session continuity:

| Key                        | Value                                                                                    |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| `ledger/current-milestone` | M0: Monorepo Scaffold — in progress                                                      |
| `ledger/progress`          | M0: CI, docs, agentic framework done. Workspace scaffold remaining.                      |
| `ledger/blockers`          | None                                                                                     |
| `ledger/decisions`         | Node.js+pnpm runtime, NestJS+Angular, pgvector, Mistral AI, strategy pattern for parsers |

**Convention**: `ledger/<topic>` for project state, `ledger/m<N>-<detail>` for milestone-specific notes.

---

## Retrospective Links

| Milestone | Date                              | Link | Key Takeaway |
| --------- | --------------------------------- | ---- | ------------ |
|           | _No retrospectives completed yet_ |      |              |

---

## How to Use This File

1. **Session start**: Read this file to understand current state
2. **During work**: Update task checkboxes as you complete them
3. **Milestone transitions**: Update milestone status in the matrix, run quality gates, update the tracker
4. **Blockers**: Add to the register immediately when discovered
5. **Session end**: Update the session log archive, memory state, and `Last Updated` date
6. **Retrospectives**: After gate-out, link the retrospective and capture key takeaway
