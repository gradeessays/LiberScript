# Liberscript Implementation Roadmap

Liberscript is **one unified product** (a single Next.js app + one background worker), not a
multi-tenant SaaS. Each phase ends in a deployable state with CI green.

| Phase | Focus | Key deliverables |
| --- | --- | --- |
| **0** | Foundation & infra | pnpm + Turborepo, shared config, `core`/`jobs`/`db`/`ui` packages, Docker Compose (PG/Redis/MinIO/MailHog), Next.js app with tRPC + `/api/health`, worker draining a ping job, CI. |
| **1** | Auth, accounts & teams | better-auth (email + Google), sessions, email verification/reset, organizations + membership + invitations, RBAC in tRPC. |
| **2** | Projects, upload & parsing | Project CRUD (personal/team), presigned S3 upload, parse-manuscript worker (DOCX/EPUB/MD/TXT/PDF), chapter detection, stats. |
| **3** | Manuscript editor | TipTap chapter editor, autosave, version snapshots. |
| **4** | Analysis & critique | Deterministic NLP (adverbs, passive voice, repetition, clichés, dialogue, pacing, show-vs-tell), inline findings, readiness scoring; optional AI passes (BYO key). |
| **5** | Metadata & readiness | Metadata editor, per-platform profile validation (KDP/Apple/Kobo/Ingram), readiness checklist. |
| **6** | Export engine | EPUB3, DOCX, print PDF (paged.js), formatting templates; generate-export worker + signed downloads. |
| **7** | AI tools (BYO key) | Provider adapters (OpenAI/Anthropic/Gemini/OpenRouter), encrypted key storage, AI metadata generation. |
| **8** | Billing & usage plans | Stripe subscriptions + metered usage, plan-limit enforcement, usage dashboard. |
| **9** | Collaboration | Realtime co-editing (Yjs + Hocuspocus), presence, comments. |
| **10** | Hardening & launch | Rate limiting, security headers, audit logging, Sentry, Playwright e2e, deploy configs. |

## Cross-cutting standards (from Phase 0)

- **Type safety:** tRPC end-to-end; Zod schemas in `@liberscript/core` are the single source.
- **Security:** AES-256-GCM for BYO AI keys, argon2 passwords, RBAC on shared resources, signed
  S3 URLs, rate limits, validated env at boot.
- **Testing:** Vitest (unit/integration) + Playwright (e2e). CI blocks on lint + typecheck + test
  + build + Prisma migrate check.
