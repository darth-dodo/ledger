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
