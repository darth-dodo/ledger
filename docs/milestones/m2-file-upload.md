# Milestone 2: File Upload

## Objective

Implement file upload for PDF/CSV bank statements with metadata persistence, CRUD endpoints, and an Angular upload UI.

## Acceptance Criteria

- [x] POST /upload accepts PDF/CSV files, validates type + extension, stores on disk with UUID filename
- [x] Statement metadata persisted to PostgreSQL via TypeORM
- [x] GET /statements returns list, GET /statements/:id returns detail with rawText
- [x] DELETE /statements/:id removes DB row and file from disk
- [x] Angular upload page with drag-and-drop FileDropzone component
- [x] 61 tests passing (10 controller unit + 9 service unit + 13 integration + existing)
- [x] CI passes (lint, types, tests, smoke test)

## Prerequisites (Gate-In)

- [x] M1 deliverables verified: health module with GET /health endpoint
- [x] CI pipeline with lint, test, build, and smoke test jobs

## Task Breakdown

| #     | Task                                  | Sub-Workflow        | Coordination | Estimate |
| ----- | ------------------------------------- | ------------------- | ------------ | -------- |
| AI-23 | Design upload strategy (ADR-001)      | architecture        | Architect    | ~30min   |
| AI-24 | Upload module with POST /upload       | feature-development | Developer    | ~1h      |
| AI-25 | Statements CRUD endpoints             | feature-development | Developer    | ~45min   |
| AI-26 | Angular upload page + FileDropzone    | feature-development | Developer    | ~1h      |
| AI-27 | Upload validation + integration tests | feature-development | Developer    | ~45min   |

## Dependency Graph (within milestone)

```
AI-23 → AI-24 (upload module needs architecture decision)
AI-24 → AI-25 (CRUD endpoints extend upload module)
AI-24 → AI-26 (frontend needs upload API)
AI-24 → AI-27 (tests need upload endpoints)
AI-25 | AI-26 | AI-27 (independent of each other after AI-24)
```

## Milestone Progress

| Task  | Status   | Notes                                                        |
| ----- | -------- | ------------------------------------------------------------ |
| AI-23 | Complete | ADR-001 documents upload strategy decisions                  |
| AI-24 | Complete | Upload module with POST /upload, Multer, UUID filenames      |
| AI-25 | Complete | GET /statements, GET /statements/:id, DELETE /statements/:id |
| AI-26 | Complete | Angular upload page with drag-and-drop FileDropzone          |
| AI-27 | Complete | 10 controller + 9 service + 13 integration tests             |

**Overall**: 5/5 complete
**Blockers**: None

## Coordination Pattern

Sequential (Architect then Developer). Architect designed the upload strategy (ADR-001), then Developer implemented all 4 remaining tasks. AI-25, AI-26, and AI-27 were parallelizable after AI-24.

## Quality Gates

| Gate             | Status | Notes                                                  |
| ---------------- | ------ | ------------------------------------------------------ |
| 1. Syntax        | Pass   | TypeScript compiles cleanly                            |
| 2. Types         | Pass   | `tsc --noEmit` passes for backend and frontend         |
| 3. Lint          | Pass   | ESLint + Prettier pass                                 |
| 4. Security      | Pass   | Layered validation: MIME type + extension + size limit |
| 5. Tests         | Pass   | 61 tests (32 new upload tests + 29 existing)           |
| 6. Performance   | N/A    | No performance targets for upload                      |
| 7. Accessibility | N/A    | Minimal frontend (upload page only)                    |
| 8. Integration   | Pass   | Smoke test passes with conditional TypeORM             |

## Deliverables

| File                                                                          | Description                                      |
| ----------------------------------------------------------------------------- | ------------------------------------------------ |
| `docs/adrs/adr-001-upload-strategy.md`                                        | Architecture decision record for upload strategy |
| `backend/src/upload/upload.module.ts`                                         | NestJS module for upload feature                 |
| `backend/src/upload/upload.controller.ts`                                     | Upload + statements endpoints                    |
| `backend/src/upload/upload.service.ts`                                        | Business logic + DB + filesystem operations      |
| `backend/src/upload/entities/statement.entity.ts`                             | TypeORM entity for statement metadata            |
| `backend/src/upload/dto/upload-response.dto.ts`                               | Response interfaces                              |
| `backend/src/upload/upload.controller.spec.ts`                                | 10 controller unit tests                         |
| `backend/src/upload/upload.service.spec.ts`                                   | 9 service unit tests                             |
| `backend/src/upload/upload.integration.spec.ts`                               | 13 integration tests                             |
| `backend/src/app.module.ts`                                                   | Updated with conditional TypeORM + UploadModule  |
| `frontend/src/app/core/services/api.service.ts`                               | HTTP client for backend communication            |
| `frontend/src/app/shared/components/file-dropzone/file-dropzone.component.ts` | Drag-and-drop file dropzone component            |
| `frontend/src/app/features/upload/upload.component.ts`                        | Upload page component                            |
| `frontend/src/app/app.routes.ts`                                              | Added /upload route                              |
| `frontend/src/app/app.config.ts`                                              | Added provideHttpClient                          |
| `frontend/src/app/app.component.ts`                                           | Added navigation bar                             |

## Fixes Applied During M2

- **TypeORM `emitDecoratorMetadata` incompatibility with vitest/esbuild**: Fixed with explicit `@Inject()` decorators and explicit `type` on `@Column()` decorators.
- **Multer package not found by vitest**: Installed as direct dependency.
- **Mock UUID format rejected by ParseUUIDPipe**: Switched to proper UUID format in tests.
- **`path.join` normalization dropping `./` prefix**: Adjusted test expectations to match normalized paths.
- **`no-explicit-any` lint errors**: Replaced with proper types (Readable, Repository<Statement>, typed destructuring).
- **CI smoke test failing due to TypeORM connection**: Made TypeORM conditional based on DATABASE_URL environment variable.

## ADRs

ADR-001: File Upload Strategy (`docs/adrs/adr-001-upload-strategy.md`). Documents the decision to use local filesystem storage with Multer, UUID-based filenames, and layered file validation.

## Risks

- Local filesystem storage does not scale to multi-user deployments (acceptable for MVP).
- No virus scanning on uploaded files (deferred to M7).
- No duplicate file detection.
