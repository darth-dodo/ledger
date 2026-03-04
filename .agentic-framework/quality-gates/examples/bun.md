# Bun Quality Gates

## Overview

Language-specific implementation of the 8-step quality gate system for projects using Bun as the runtime, package manager, test runner, and bundler. Covers NestJS (backend) and Angular (frontend) where applicable.

**Tech Stack**: Bun, TypeScript, ESLint, bun:test, Playwright

---

## Gate 1: Syntax Validation

### Commands

```bash
# TypeScript syntax check (Bun uses tsc for type/syntax checking)
bun run tsc --noEmit

# Check a specific file
bun run tsc --noEmit src/index.ts

# Quick syntax validation via Bun's transpiler
bun build src/index.ts --no-bundle --outdir /dev/null 2>&1
```

### Pre-commit Hook

```bash
#!/bin/bash
echo "Gate 1: Syntax Validation"
bun run tsc --noEmit
if [ $? -ne 0 ]; then
    echo "Syntax errors found"
    exit 1
fi
echo "Syntax validation passed"
```

### CI/CD Integration

```yaml
- name: Gate 1 - Syntax Validation
  run: |
    bun install
    bun run tsc --noEmit
```

---

## Gate 2: Type Safety

### Commands

```bash
# Strict type checking
bun run tsc --strict --noEmit

# With specific strict flags
bun run tsc --noEmit --noImplicitAny --strictNullChecks --noUncheckedIndexedAccess

# Find `any` types in codebase
grep -r "any" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules
```

### Configuration

**tsconfig.json** (strict for Bun projects):

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "types": ["bun-types"],
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### CI/CD Integration

```yaml
- name: Gate 2 - Type Safety
  run: bun run tsc --strict --noEmit
```

---

## Gate 3: Code Quality (Lint)

### Commands

```bash
# Run linter
bun run lint

# Lint with auto-fix
bun run lint --fix

# Format check
bun run prettier --check "src/**/*.{ts,tsx,js,json,css,html}"

# Auto-format
bun run prettier --write "src/**/*.{ts,tsx,js,json,css,html}"

# Combined
bun run lint && bun run prettier --check .
```

### Configuration

**package.json scripts**:

```json
{
  "scripts": {
    "lint": "eslint src/ --ext .ts,.tsx",
    "lint:fix": "eslint src/ --ext .ts,.tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,js,json,css,html}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,js,json,css,html}\""
  }
}
```

### Pre-commit Hook

```bash
#!/bin/bash
echo "Gate 3: Code Quality"

STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx)$')
if [ -z "$STAGED_FILES" ]; then
    exit 0
fi

bun run prettier --write $STAGED_FILES
bun run eslint $STAGED_FILES --fix
if [ $? -ne 0 ]; then
    echo "Linting errors require manual fixes"
    exit 1
fi

git add $STAGED_FILES
echo "Code quality passed"
```

---

## Gate 4: Security

### Commands

```bash
# Bun doesn't have a built-in audit command yet
# Use npm audit on the lockfile or manual checks

# Check for known vulnerabilities in dependencies
bun pm ls | head -50

# Secret detection in staged files
git diff --cached --name-only | xargs grep -lE "(api[_-]?key|secret|password|token).*=.*['\"][^'\"]+['\"]" 2>/dev/null

# Verify .env is not committed
git ls-files | grep "\.env$"

# ESLint security plugin
bun run eslint --plugin security src/
```

### Configuration

**.gitignore** (ensure secrets are excluded):

```
.env
.env.local
.env.*.local
*.pem
*.key
```

**Note**: Bun automatically loads `.env` files. Never commit them.

### CI/CD Integration

```yaml
- name: Gate 4 - Security
  run: |
    # Check for secrets in source
    if grep -rE "(api[_-]?key|secret|password).*=.*['\"][^'\"]+['\"]" src/; then
      echo "Potential secrets found in source code"
      exit 1
    fi

    # Verify no .env files tracked
    if git ls-files | grep -q "\.env$"; then
      echo ".env files should not be committed"
      exit 1
    fi

    # Security lint
    bun run eslint --plugin security src/
```

---

## Gate 5: Tests

### Commands

```bash
# Run all tests
bun test

# Run tests with coverage
bun test --coverage

# Run specific test file
bun test src/utils/parser.test.ts

# Run tests matching pattern
bun test --grep "upload"

# Watch mode
bun test --watch
```

### Configuration

**Test file convention**: `*.test.ts` or `*.spec.ts`

**Example test** (using bun:test):

```typescript
import { test, expect, describe, beforeEach, mock } from 'bun:test';

describe('TransactionParser', () => {
  test('parses CSV row into transaction', () => {
    const row = '2024-01-15,Swiggy,-450.00,Food';
    const result = parseTransaction(row);

    expect(result.date).toEqual(new Date('2024-01-15'));
    expect(result.description).toBe('Swiggy');
    expect(result.amount).toBe(-450.0);
    expect(result.category).toBe('Food');
  });

  test('handles malformed rows gracefully', () => {
    const row = 'invalid,data';
    expect(() => parseTransaction(row)).toThrow('Invalid transaction format');
  });

  test('handles empty amount', () => {
    const row = '2024-01-15,Swiggy,,Food';
    expect(() => parseTransaction(row)).toThrow('Missing amount');
  });
});
```

### Pre-commit Hook

```bash
#!/bin/bash
echo "Gate 5: Tests"
bun test
if [ $? -ne 0 ]; then
    echo "Tests failed"
    exit 1
fi
echo "Tests passed"
```

### CI/CD Integration

```yaml
- name: Gate 5 - Tests
  run: |
    bun test --coverage
    # Fail if coverage below threshold
    # (check bun test --coverage output)
```

---

## Gate 6: Performance

### Commands

```bash
# Build and check output size
bun build src/index.ts --outdir dist --minify
du -sh dist/

# Build HTML entry point (for frontend)
bun build src/index.html --outdir dist --minify
du -sh dist/

# Run benchmarks (if defined)
bun test --grep "bench"

# Check bundle composition
ls -la dist/
```

### Performance Budgets

| Metric | Target |
|--------|--------|
| API response time | < 200ms |
| Bundle size (frontend) | < 500KB gzipped |
| Build time | < 30s |
| Test suite | < 60s |
| Statement parse time | < 5s for 100-page PDF |

### CI/CD Integration

```yaml
- name: Gate 6 - Performance
  run: |
    bun build src/index.ts --outdir dist --minify

    # Check bundle size
    BUNDLE_SIZE=$(du -sm dist/ | cut -f1)
    if [ $BUNDLE_SIZE -gt 5 ]; then
      echo "Bundle exceeds 5MB: ${BUNDLE_SIZE}MB"
      exit 1
    fi

    echo "Bundle size: ${BUNDLE_SIZE}MB - OK"
```

---

## Gate 7: Accessibility

### Commands

```bash
# ESLint a11y plugin (for Angular templates, use Angular-specific tooling)
bun run eslint --plugin jsx-a11y src/

# Playwright accessibility tests
bun run playwright test tests/e2e/accessibility.spec.ts

# Lighthouse accessibility audit
npx lighthouse http://localhost:4200 --only-categories=accessibility --output=json
```

### Accessibility Checklist

- [ ] All images have alt text
- [ ] Form fields have labels
- [ ] Interactive elements are keyboard-accessible
- [ ] Color contrast meets WCAG AA
- [ ] Heading hierarchy is correct
- [ ] ARIA attributes used correctly

### CI/CD Integration

```yaml
- name: Gate 7 - Accessibility
  run: |
    bun run lint  # includes a11y rules
    bun run playwright test tests/e2e/accessibility.spec.ts
```

---

## Gate 8: Integration

### Commands

```bash
# Build entire project
bun run build

# Start server and verify health
bun run start &
sleep 3
curl -f http://localhost:3000/health || exit 1
kill %1

# Run E2E tests against built app
bun run build && bun run start &
sleep 3
bun run playwright test tests/e2e/smoke.spec.ts
kill %1
```

### Health Check Test

```typescript
import { test, expect } from 'bun:test';

test('health endpoint returns OK', async () => {
  const response = await fetch('http://localhost:3000/health');
  expect(response.ok).toBe(true);

  const data = await response.json();
  expect(data.status).toBe('ok');
});
```

### CI/CD Integration

```yaml
- name: Gate 8 - Integration
  run: |
    bun run build
    bun run start &
    sleep 5
    curl -f http://localhost:3000/health || exit 1

    bun run playwright test tests/e2e/smoke.spec.ts

    kill %1
```

---

## Combined Pre-commit Hook

```bash
#!/bin/bash
set -e

echo "Running Bun Quality Gates..."

# Gate 1: Syntax
echo "Gate 1: Syntax"
bun run tsc --noEmit

# Gate 2: Types (covered by strict tsc above)

# Gate 3: Lint
echo "Gate 3: Code Quality"
bun run lint

# Gate 4: Security (quick check)
echo "Gate 4: Security"
if git diff --cached --name-only | xargs grep -lE "(api[_-]?key|secret|password).*=.*['\"][^'\"]+['\"]" src/ 2>/dev/null; then
    echo "Potential secrets in staged files"
    exit 1
fi

# Gate 5: Tests
echo "Gate 5: Tests"
bun test

echo "All quality gates passed"
```

---

## Combined CI/CD Pipeline

```yaml
name: Quality Gates (Bun)

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  quality-gates:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: pgvector/pgvector:pg16
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: ledger_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install Dependencies
        run: bun install

      - name: Gate 1+2 - Syntax & Types
        run: bun run tsc --strict --noEmit

      - name: Gate 3 - Code Quality
        run: |
          bun run lint
          bun run prettier --check .

      - name: Gate 4 - Security
        run: |
          if git ls-files | grep -q "\.env$"; then exit 1; fi

      - name: Gate 5 - Tests
        run: bun test --coverage
        env:
          DATABASE_URL: postgres://postgres:test@localhost:5432/ledger_test

      - name: Gate 6 - Performance
        run: |
          bun run build
          du -sh dist/

      - name: Gate 8 - Integration
        run: |
          bun run start &
          sleep 5
          curl -f http://localhost:3000/health
          kill %1
        env:
          DATABASE_URL: postgres://postgres:test@localhost:5432/ledger_test
```

---

## Bun-Specific Notes

- **No `npm audit` equivalent**: Bun doesn't have a built-in audit command. Use `npm audit` with `--package-lock-only` or Snyk for dependency scanning.
- **Auto .env loading**: Bun loads `.env` automatically. Never commit `.env` files.
- **bun:test is built-in**: No need for Vitest or Jest. Use `import { test, expect } from "bun:test"`.
- **bun build for bundling**: Use `bun build` instead of Webpack/Vite for server-side bundles. For HTML entry points, Bun supports HTML imports with automatic bundling.
- **Speed advantage**: Bun's test runner and bundler are significantly faster than Node.js equivalents. Expect 2-5x faster quality gate runs.
