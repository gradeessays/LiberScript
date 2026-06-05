# Deployment (DigitalOcean)

**Decision (2026-06):** PostgreSQL stays the database engine. Production runs on
DigitalOcean using **managed services** so the droplet stays stateless.

## Topology

```
                 ┌──────────────────────────────────────────┐
   Users ──────► │  DigitalOcean Droplet (Ubuntu)            │
   (HTTPS)       │   ├─ Next.js app  (apps/web)   :3000      │
                 │   ├─ Worker       (apps/worker)           │
                 │   └─ Caddy/Nginx (TLS, reverse proxy)     │
                 └──────────┬──────────────┬─────────────────┘
                            │              │
        ┌───────────────────┘      ┌───────┴───────────┐
        ▼                          ▼                   ▼
  DO Managed Postgres        DO Managed Redis      DO Spaces
  (DATABASE_URL,             (REDIS_URL,           (S3-compatible:
   sslmode=require)           rediss:// TLS)        manuscripts/exports)
```

- **App + worker** run on the droplet (same repo, same env). Both are stateless;
  all durable state lives in the managed services.
- **No code changes** vs. local: only environment values differ. `packages/storage`
  already speaks the S3 API, so DO Spaces works by pointing `S3_ENDPOINT` at it.

## Why this shape
- Managed Postgres/Redis give automatic **backups, failover, and patching** — no
  database babysitting on the droplet.
- Spaces is **S3-compatible**, so the same presigned-upload/download code serves
  prod and local (MinIO) unchanged.
- The droplet is cattle, not a pet: rebuildable from the repo + env.

## Provisioning checklist
1. **Droplet**: Ubuntu LTS, 2 vCPU / 4 GB+ to start. Add a firewall (allow 80/443).
2. **Managed Postgres**: create DB `liberscript`; copy the connection string and
   append `?sslmode=require` → `DATABASE_URL`.
3. **Managed Redis (Valkey)**: copy the **`rediss://`** (TLS) URI → `REDIS_URL`.
4. **Spaces**: create a bucket; generate a Spaces access key/secret. Set
   `S3_ENDPOINT=https://<region>.digitaloceanspaces.com`, `S3_REGION=<region>`,
   `S3_BUCKET=<bucket>`, `S3_FORCE_PATH_STYLE=false`, and the key/secret.
5. **Secrets**: `AUTH_SECRET` and `ENCRYPTION_KEY` via `openssl rand -base64 32`.
6. **Email**: a transactional SMTP provider (e.g. Postmark/SES) → `SMTP_*`.
7. **DNS + TLS**: point the domain at the droplet; terminate TLS at Caddy/Nginx
   and proxy to the Next app on `:3000`. Set `APP_URL=https://your-domain`.

## Release steps (per deploy)
```bash
pnpm install --frozen-lockfile
pnpm db:generate
pnpm db:migrate:deploy   # apply versioned migrations (managed PG)
pnpm db:seed             # idempotent reference data (platform profiles)
pnpm build
# start: apps/web (next start) + apps/worker (node) under a process manager
```

## Still to come (Phase 10 — Hardening)
- Production **Dockerfiles** (web + worker) and a deploy `docker-compose.yml` /
  systemd units, plus a GitHub Actions deploy workflow.
- Caddy/Nginx reverse-proxy config and zero-downtime restart strategy.
- Backup/restore runbook (managed PG handles snapshots; document PITR + Spaces
  lifecycle rules).

> Until then, the app is configuration-ready for this topology: set the env
> values above and the existing code targets DO with no changes.
