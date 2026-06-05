# Liberscript

A unified publishing workspace — **write, analyze, format, and export your book, all under one
roof.** Liberscript merges the capabilities of Atticus (writing + formatting + export), Reedsy
(collaboration), and AutoCrit (AI/NLP manuscript critique) into a single product.

> This is one product, not a multi-tenant SaaS: a single Next.js app (UI + API) plus one
> background worker, sharing typed packages.

## Stack

- **App:** Next.js 15 (App Router, React 19) — UI **and** API (tRPC route handlers).
- **Worker:** single BullMQ process (`apps/worker`) for parsing, analysis, and exports.
- **Data:** PostgreSQL + Prisma (`packages/db`); Redis for the queue; S3-compatible object storage.
- **Auth:** better-auth (email + Google) with team/organization sharing.
- **Tooling:** pnpm + Turborepo, TypeScript (strict), Zod, ESLint, Prettier, Vitest, Playwright.

## Layout

```
apps/web        The product — Next.js UI + API
apps/worker     Background worker (BullMQ)
packages/core   Env, errors, constants, shared types
packages/db     Prisma schema, client, seed
packages/jobs   Queue + typed job payloads
packages/ui     Design system (Tailwind + components)
packages/config Shared tsconfig / eslint presets
```

(`analysis`, `exports`, `ai`, `auth` packages arrive in later phases.)

## Getting started (no Docker required)

Storage and email use zero-infra dev drivers, so you only need a **Postgres** URL
and a **Redis** URL (free cloud tiers or native). Full walkthrough:
**[docs/LOCAL_SETUP.md](./docs/LOCAL_SETUP.md)**.

```bash
# 1. Install deps
pnpm install

# 2. Configure env — set DATABASE_URL + REDIS_URL (Neon/Upstash or native).
#    Storage defaults to local disk, email to console logging.
cp .env.example .env

# 3. Set up the database (migrate:deploy applies committed migrations)
pnpm db:generate
pnpm db:migrate:deploy
pnpm db:seed

# 4. Run the app + worker
pnpm dev
```

- Web app: http://localhost:3000
- Health: http://localhost:3000/api/health · Readiness: http://localhost:3000/api/ready
- Uploaded files land in `.data/uploads`; emails (verification/reset/invite links)
  print to the terminal.

> Prefer containers? `docker compose up -d` still provides Postgres/Redis/MinIO/
> MailHog; then set `STORAGE_DRIVER=s3` + `MAIL_DRIVER=smtp` to use them.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Run web + worker in watch mode |
| `pnpm build` | Build all packages/apps |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | Quality gates (also run in CI) |
| `pnpm db:migrate` / `pnpm db:seed` / `pnpm db:studio` | Database workflows |

## Roadmap

See [`docs/`](./docs) for the phased implementation plan (foundation → auth/teams → upload/parse
→ editor → analysis → metadata → export → AI tools → billing → collaboration → hardening).
