# Liberscript MVP Project Structure

This repository layout is designed for a clean, scalable TypeScript full-stack publishing workspace.

## Root folders

- `apps/web/` — Next.js frontend application and public website pages.
- `apps/api/` — Backend service and API endpoints for uploads, analysis, export jobs, AI requests, and auth.
- `packages/ui/` — Shared UI components, design system, and theme utilities.
- `packages/db/` — Prisma schema, database migrations, and shared database utilities.
- `packages/exports/` — Export generation engine for PDF, EPUB, and DOCX.
- `packages/analysis/` — Manuscript analysis, chapter detection, readiness scoring, and content parsing.
- `packages/ai/` — AI metadata assistant, provider adapters, and API key handling.
- `packages/auth/` — Authentication flows, session handling, password recovery, and OAuth connectors.
- `prisma/` — Prisma schema files, seed data, and database config.
- `public/` — Static assets, images, fonts, and website public files.
- `scripts/` — automation scripts for setup, migrations, export generation helpers, and developer tooling.
- `docs/` — Product specs, feature definitions, onboarding docs, and architecture notes.
- `.github/` — GitHub workflows, issue templates, and repository automation.

## Suggested contents by folder

### `apps/web/`
- `app/` or `pages/` for Next.js routes
- `components/` for page-specific UI
- `hooks/` for frontend hooks
- `lib/` for API client and utilities
- `styles/` for global styles and theme tokens
- `public/` for frontend assets

### `apps/api/`
- `routes/` or `controllers/` for REST/trpc endpoints
- `services/` for upload processing, export jobs, and AI orchestration
- `workers/` for background queue processing
- `lib/` for shared helpers, validation, and platform profiles
- `middleware/` for authentication, rate limiting, and request validation

### `packages/ui/`
- `components/` for reusable UI primitives
- `layout/` for dashboard and page structure components
- `icons/` for shared icon components
- `theme/` for design tokens and Tailwind config

### `packages/db/`
- `schema.prisma`
- `migrations/`
- `seed.ts`
- `prismaClient.ts`

### `packages/exports/`
- `pdf/` for HTML-to-PDF templates and helpers
- `epub/` for EPUB generation and packaging
- `docx/` for document export templates and templating logic
- `types/` for export payload definitions

### `packages/analysis/`
- `manuscript/` for parser adapters and content extraction
- `readiness/` for score calculation and recommendation rules
- `genre/` for genre detection models and overrides
- `stats/` for word counts, pages, and reading time estimation

### `packages/ai/`
- `providers/` for OpenAI, Anthropic, Gemini, and OpenRouter adapters
- `helpers/` for prompt building and response normalization
- `key-management/` for encrypted API key storage and validation

### `packages/auth/`
- `email/` for registration, login, password recovery
- `oauth/` for Google sign-in
- `sessions/` for cookie/session management
- `validation/` for auth request schemas

## High-level architecture

- Frontend handles UI, project management, dashboard, metadata editor, and export flow.
- API handles uploads, analysis, platform profiles, metadata persistence, auth, and export generation.
- Shared packages isolate domain logic so the frontend and backend can reuse models, validation, and helpers.
- Background workers process expensive tasks such as manuscript parsing, readiness scoring, and file exports.

## Notes

- Start MVP with `Next.js + TypeScript` in `apps/web/` and `apps/api/`.
- Use `Prisma + PostgreSQL` in `packages/db/`.
- Use `S3-compatible` storage for manuscript and export file persistence.
- Keep AI provider integration modular so new providers can be added later.
