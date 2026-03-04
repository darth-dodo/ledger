# Retrospective: Milestone 2 — File Upload

**Date**: 2026-03-04
**Duration of milestone**: ~3 hours
**Participants**: Architect + Developer (sequential)

---

## Summary

The goal of M2 was to implement the full file upload pipeline — ADR, NestJS upload module with CRUD endpoints, Angular upload page with drag-and-drop, and comprehensive tests. All 5 Linear issues (AI-23 through AI-27) were completed successfully. 61 tests pass and CI is green. Several compatibility issues between vitest/esbuild and NestJS/TypeORM were discovered and resolved, accounting for the majority of unplanned time.

---

## What Went Well

- **ADR-first approach**: Writing ADR-001 before code clarified storage strategy, validation layers, and API design
- **Following M1's module pattern**: The health module template made upload module structure predictable
- **Layered validation**: MIME type + extension + size limit catches bad input at the earliest point
- **Integration tests caught real issues**: supertest-based tests validated actual HTTP behavior including file upload multipart handling
- **Comprehensive test coverage**: 32 new tests (10 controller + 9 service + 13 integration) give high confidence

---

## What Didn't Go Well

- **vitest/esbuild + emitDecoratorMetadata incompatibility**: This was the biggest time sink. NestJS relies on TypeScript's emitDecoratorMetadata for DI, but vitest uses esbuild which does not support it. Required explicit `@Inject()` decorators on constructors and explicit `type` on all TypeORM `@Column()` decorators.
- **Multiple CI fix iterations**: Lint errors (no-explicit-any), Prettier formatting, and smoke test failure (TypeORM blocking startup) each required separate fix commits
- **Conditional module loading**: Had to make TypeORM conditional in AppModule to allow smoke test with `DATABASE_URL=fake`. This added complexity.

---

## Surprises

- `path.join('./uploads', 'file.pdf')` normalizes to `uploads/file.pdf` (drops the `./` prefix) — required test expectation adjustment
- Mock UUIDs like `test-uuid-abc123` are rejected by NestJS's ParseUUIDPipe — had to generate proper UUID format
- Multer needed to be a direct dependency (not just transitive) for vitest's esbuild resolver to find it
- The esbuild + NestJS DI issue is a known ecosystem gap — no clean solution exists without SWC or explicit `@Inject()`

---

## Metrics

| Metric                | Target  | Actual                                              |
| --------------------- | ------- | --------------------------------------------------- |
| Duration              | ~2 days | ~3 hours                                            |
| Test coverage         | 70%+    | Adequate (61 tests, full coverage of upload module) |
| Quality gates passing | 8/8     | 6/8 (2 N/A: Performance, Accessibility)             |
| Bugs found post-merge | 0       | 0                                                   |

---

## Framework Adjustments

Changes to make to the agentic framework based on this milestone's experience:

- [ ] Document the vitest/esbuild + emitDecoratorMetadata workaround as a standard pattern: always use explicit `@Inject()` and explicit `type` on `@Column()`
- [ ] Add "conditional module loading for CI smoke test" as a standard pattern when adding database-dependent modules
- [ ] Run full CI check locally before pushing (lint + prettier + tests) to avoid multiple fix commits
- [ ] Add Prettier check to pre-commit hooks to catch formatting issues earlier

---

## Action Items for Next Milestone

| Action                                                                     | Owner     | Priority |
| -------------------------------------------------------------------------- | --------- | -------- |
| Consider shared test helpers for mock file/repo creation across test files | Developer | Medium   |
| Evaluate SWC plugin for vitest to avoid manual @Inject() workaround        | Developer | Low      |
| Run `npx prettier --check .` before push to avoid CI formatting failures   | Developer | High     |

---

## Handoff to Milestone 3

**What M3 should know**:

- Upload module stores files on disk and metadata in PostgreSQL — raw_text column is nullable, ready for M3 to populate
- Statement entity has all fields needed: id, filename, fileType, filePath, fileSize, rawText, uploadedAt
- The explicit `@Inject()` + explicit `type` pattern MUST be followed for all new NestJS modules and TypeORM entities
- AppModule conditionally loads TypeORM — new database-dependent modules should be included in the same conditional block
- 61 tests passing, CI green with lint + types + tests + smoke test gates

**Recommended approach for M3**:

- Create a ParserService with strategy pattern (as designed in architecture.md)
- Implement PDF parser (pdf-parse) and CSV parser (csv-parse)
- Add a transactions table and entity following the Statement entity pattern
- Wire parsing into the upload flow: after file storage, parse and populate raw_text + transactions
- Follow the same test patterns: unit tests for parsers, integration tests for full parse pipeline
