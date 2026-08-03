# AGENTS.md

This repository is a standard NestJS (TypeScript, Node.js) project using Prisma (with PostgreSQL) for data access.

## Quick Start & Core Commands

- **Install dependencies first:**
  ```bash
  npm install
  ```
- **Development server (auto-reloads):**
  ```bash
  npm run start:dev
  ```
- **Production build & run:**
  ```bash
  npm run start:prod
  ```
- **Unit tests (Jest):**
  ```bash
  npm run test
  ```
- **E2E tests:**
  ```bash
  npm run test:e2e
  ```
- **Test coverage:**
  ```bash
  npm run test:cov
  ```

## Prisma & Database
- Uses **Prisma** as ORM, configured for PostgreSQL (see `prisma/migrations/migration_lock.toml`).
- **Migration files** are in `prisma/migrations/`.
- Run Prisma/DB commands as you would in a typical NestJS + Prisma project.
  (No custom workflow or instruction overrides detected; check for a `package.json` if uncertain.)
  
## Layout and Conventions
- No monorepo/workspace config or explicit custom conventions detected.
- No custom OpenCode config, lint, pre-commit, or CI instructions present.
- No cross-package boundaries—main entrypoint should follow `src/main.ts` unless otherwise indicated by `package.json`.
- If any essentials appear missing (such as `package.json`), check for nonstandard project layout or incomplete file check-in.

## When Unsure
- For any setup, test, or workflow not covered by the above, defer to default [NestJS](https://docs.nestjs.com/) and [Prisma](https://www.prisma.io/docs/) practices—they apply directly here.

---
This guide intentionally omits generic language/framework advice and includes only what an agent would likely miss on first inspection.