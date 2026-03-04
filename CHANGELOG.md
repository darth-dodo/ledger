# Changelog

All notable changes to the Ledger project.

## [Unreleased]

## [0.3.0] — 2026-03-04

### Milestone 2: File Upload

### Added

- ADR-001 documenting upload strategy (local filesystem, Multer, layered validation)
- Upload module — NestJS controller + service with POST /upload, GET/DELETE /statements endpoints
- Statement TypeORM entity for `statements` table (UUID PK, file metadata, raw_text)
- Layered file validation — MIME type + extension check, 10MB limit, UUID filenames on disk
- Angular upload page with drag-and-drop FileDropzone component
- Angular ApiService for HTTP communication with backend
- 10 controller unit tests, 9 service unit tests, 13 integration tests (61 total)
- TypeORM + PostgreSQL integration with conditional module loading for CI

### Changed

- AppModule conditionally loads TypeORM when DATABASE_URL is present (smoke test compatibility)

## [0.2.0] — 2026-03-04

### Milestone 1: Health Check

### Added

- NestJS health module with GET /health endpoint returning `{ status: "ok", timestamp, uptime }`
- 4 unit tests + 3 integration tests for health controller (supertest)
- CI smoke test job that boots server and validates /health

### Fixed

- Missing @types/node in backend devDependencies (M0 gap)
- Backend ESLint script not working from subdirectory (M0 gap)

## [0.1.0] — 2026-03-04

### Milestone 0: Monorepo Scaffold

### Added

- NestJS backend scaffold with AppModule, AppController, and tests
- Angular frontend scaffold with standalone components (pnpm)
- Typed config loader (`backend/src/config.ts`) with env validation and defaults
- Structured JSON logger (`backend/src/logger.ts`) implementing NestJS LoggerService
- Graceful shutdown hooks (SIGTERM/SIGINT) in `main.ts`
- CORS support configurable via `CORS_ORIGIN` env var
- Multi-stage backend Dockerfile (`node:22-alpine` + pnpm)
- Docker Compose with PostgreSQL + pgvector and backend service
- Database migration runner scaffold (`backend/src/db/migrate.ts`)
- ESLint v9 flat config with typescript-eslint and Prettier
- Pre-commit hooks for code quality gates
- GitHub Actions CI (lint, test, build)
- Product and architecture documentation with Mermaid diagrams
- Agentic framework with personas, workflows, and quality gates
- `.env.example` with all configuration variables

### Changed

- **Runtime migration**: Bun → Node.js + pnpm + tsx + vitest
- Root and backend package.json scripts unified on pnpm
- Dockerfile switched from `oven/bun` to `node:22-alpine`
- CI workflow switched from `oven-sh/setup-bun` to `actions/setup-node` + `pnpm/action-setup`
- All `Bun.env` references replaced with `process.env` + dotenv
- All `bun:test` imports replaced with `vitest`
- CLAUDE.md rewritten for Node.js + pnpm guidance
- Agentic framework config updated for pnpm/vitest toolchain

### Removed

- Bun runtime dependency and `@types/bun`
- `bun.lock` lockfile
- Bun-specific quality gates example (`bun.md`)

### 12-Factor Compliance

- **#2 Dependencies**: Both `bun.lock` (removed) and `pnpm-lock.yaml` committed
- **#3 Config**: All config via environment variables, validated at startup
- **#5 Build/Release/Run**: Multi-stage Docker build separates concerns
- **#6 Processes**: Stateless server, no local state
- **#7 Port Binding**: PORT configurable via env (default 3000)
- **#9 Disposability**: Graceful shutdown with `enableShutdownHooks()`
- **#10 Dev/Prod Parity**: Same Docker image for all environments
- **#11 Logs**: Structured JSON to stdout, no file logging
- **#12 Admin Processes**: Migration runner scaffold in place
