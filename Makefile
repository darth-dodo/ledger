# ================================================================
#  Ledger - Monorepo Makefile
# ================================================================
#  Backend:  NestJS + TypeORM + pgvector  (backend/)
#  Frontend: Angular 21+                  (frontend/)
#  Database: PostgreSQL 16 + pgvector     (docker-compose.yml)
#
#  Quick Reference:
#    make install        Install all dependencies
#    make dev            Start DB + backend + frontend
#    make dev-backend    Start backend dev server only
#    make dev-frontend   Start frontend dev server only
#    make test           Run all tests
#    make test-backend   Run backend tests only
#    make test-frontend  Run frontend tests only
#    make build          Type-check + build all
#    make lint           Run ESLint
#    make format         Run Prettier (write mode)
#    make format-check   Run Prettier (check mode)
#    make db-up          Start PostgreSQL container
#    make db-down        Stop PostgreSQL container
#    make db-reset       Destroy and recreate database
#    make db-migrate     Run database migrations
#    make clean          Remove build artifacts + node_modules
#    make check          Lint + type-check + tests (CI pipeline)
# ================================================================

.PHONY: install dev dev-backend dev-frontend \
        test test-backend test-frontend test-coverage \
        build build-backend build-frontend \
        lint lint-fix format format-check \
        db-up db-down db-reset db-logs db-migrate \
        clean check help

# -- Defaults --
.DEFAULT_GOAL := help

# ── Dependencies ─────────────────────────────────────

install: ## Install all dependencies (root + backend + frontend)
	pnpm install
	cd backend && pnpm install
	cd frontend && pnpm install

# ── Development ──────────────────────────────────────

dev: db-up ## Start DB, backend, and frontend (parallel, use Ctrl-C to stop)
	@echo "Starting backend and frontend in parallel..."
	@echo "  Backend:  http://localhost:3000"
	@echo "  Frontend: http://localhost:4200"
	@echo ""
	@trap 'kill 0' INT; \
		(cd backend && pnpm dev) & \
		(cd frontend && pnpm dev) & \
		wait

dev-backend: db-up ## Start backend dev server only
	cd backend && pnpm dev

dev-frontend: ## Start frontend dev server only
	cd frontend && pnpm dev

# ── Testing ──────────────────────────────────────────

test: test-backend test-frontend ## Run all tests

test-backend: ## Run backend tests (vitest)
	cd backend && pnpm test

test-frontend: ## Run frontend tests with coverage (vitest)
	cd frontend && pnpm test

test-coverage: ## Run all tests with coverage reports
	cd backend && pnpm test:coverage
	cd frontend && pnpm test

# ── Build ────────────────────────────────────────────

build: build-backend build-frontend ## Type-check + build all

build-backend: ## Type-check backend (tsc --noEmit)
	cd backend && pnpm build

build-frontend: ## Build frontend for production
	cd frontend && pnpm build

# ── Code Quality ─────────────────────────────────────

lint: ## Run ESLint across the project
	pnpm lint

lint-fix: ## Run ESLint with auto-fix
	pnpm lint:fix

format: ## Format code with Prettier (write mode)
	pnpm format

format-check: ## Check formatting with Prettier
	pnpm format:check

# ── Database ─────────────────────────────────────────

db-up: ## Start PostgreSQL container
	@docker compose up -d db
	@echo "PostgreSQL running on localhost:5432"

db-down: ## Stop PostgreSQL container
	docker compose down

db-reset: ## Destroy database volume and recreate
	docker compose down -v
	docker compose up -d db
	@echo "Database reset. Waiting for PostgreSQL to be ready..."
	@until docker compose exec db pg_isready -U ledger -d ledger > /dev/null 2>&1; do \
		sleep 1; \
	done
	@echo "PostgreSQL is ready."

db-logs: ## Tail PostgreSQL container logs
	docker compose logs -f db

db-migrate: ## Run database migrations
	cd backend && pnpm run migrate

db-migrate-revert: ## Revert last database migration
	cd backend && pnpm run migration:revert

# ── Cleanup ──────────────────────────────────────────

clean: ## Remove build artifacts and node_modules
	rm -rf node_modules
	rm -rf backend/node_modules backend/dist
	rm -rf frontend/node_modules frontend/dist frontend/.angular
	@echo "Cleaned all build artifacts and node_modules."

# ── CI Pipeline ──────────────────────────────────────

check: lint format-check build test ## Run full CI pipeline: lint + format + build + test
	@echo ""
	@echo "All checks passed."

# ── Help ─────────────────────────────────────────────

help: ## Show this help message
	@echo "Ledger Monorepo - Available targets:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'
	@echo ""
