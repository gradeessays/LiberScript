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

## Cheap, scalable stack (current target)
Everything below uses free/low-cost services and one small droplet; swap any piece
for a managed equivalent later without code changes (storage already speaks S3).

| Piece | Service | Cost | Notes |
|---|---|---|---|
| App + worker host | **DO droplet** (Docker) | ~$6–12/mo | 1 GB works with swap; 2 GB ($12) is comfier for the Print-PDF Chromium. |
| Postgres | **Neon** | Free | Already in use; use the **pooled** URL. |
| Redis | **Upstash** | Free | Already in use; `rediss://` TLS URL. |
| Object storage | **Cloudflare R2** | Free 10 GB, **$0 egress** | S3-compatible; cheapest at scale. (DO Spaces $5/mo is the alt.) |
| TLS / proxy | **Caddy** | Free | Automatic HTTPS via Let's Encrypt. |

### One-time setup
1. **Cloudflare R2**: create a bucket (e.g. `liberscript`) + an **R2 API token**
   (Object Read & Write). Add a **CORS** rule allowing `PUT, GET` from your
   `APP_URL`. Endpoint is `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`.
2. **Neon**: copy the **pooled** connection string (host has `-pooler`) → `DATABASE_URL`.
3. **Upstash**: copy the `rediss://` URL → `REDIS_URL`.
4. **Secrets**: `openssl rand -base64 32` for `AUTH_SECRET` and `ENCRYPTION_KEY`.
5. **Email**: transactional SMTP (ZeptoMail/Postmark/SES) → `SMTP_*`.
6. **Droplet**: Ubuntu LTS; install Docker + compose plugin; open firewall 80/443.
   On a 1 GB droplet add swap so the in-image build doesn't OOM:
   `fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile`.
7. **DNS**: point an `A` record for your domain at the droplet IP.

### Deploy
```bash
git clone <repo> && cd liberscript
cp .env.production.example .env.production && nano .env.production   # fill in
pnpm dlx -y -- true   # (optional) warm caches

# migrate the schema once (from any machine with DATABASE_URL, or on the droplet):
docker compose -f docker-compose.prod.yml run --rm worker pnpm db:migrate:prod

# build + start web, worker, caddy:
docker compose -f docker-compose.prod.yml up -d --build
```
Caddy obtains TLS automatically for `APP_DOMAIN`. Visit `https://<APP_DOMAIN>` →
sign up → upload → edit → preview → export. `GET /api/health` should be `200`.

### Update / redeploy
```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml run --rm worker pnpm db:migrate:prod   # if migrations changed
```

### Local production smoke test (no domain)
```bash
docker compose -f docker-compose.prod.yml build web worker
docker compose -f docker-compose.prod.yml run --service-ports -e APP_URL=http://localhost:3000 web
# open http://localhost:3000
```

### Notes & troubleshooting
- **R2 CORS**: browser uploads PUT directly to the presigned R2 URL — the bucket
  needs a CORS rule allowing `PUT, GET, HEAD` from your `APP_URL` (and
  `Content-Type` in `AllowedHeaders`). Without it, uploads fail in the browser.
- **Neon cold starts**: the pooled URL + the connect/pool timeouts the app appends
  handle this; the first request after idle can take a second.
- **Print-PDF**: Chromium ships in the worker image (`/usr/bin/chromium`). If a
  job logs a sandbox error, confirm the container has the libs (the base image
  does) — it already launches with `--no-sandbox`.
- **Prisma engine in the web image**: Next's standalone tracing bundles the
  query engine. If a DB call in the web container ever errors with “engine not
  found”, copy it in the runner stage:
  `COPY --from=build /app/node_modules/.pnpm/@prisma+client*/node_modules/.prisma ./node_modules/.prisma`.
- **1 GB droplet**: add swap (above) before `--build`, or build images on a
  bigger machine / CI and `docker compose pull` on the droplet.
- The Dockerfiles use Next `output: 'standalone'`, which traces files on Linux;
  the Windows dev box can't create the standalone symlinks (EPERM) — that's
  expected and doesn't affect the Linux image build.

## Print-PDF export needs Chromium (worker)
The **interior Print PDF** export runs paged.js inside headless Chromium
(`pagedjs-cli` → puppeteer). EPUB / DOCX / cover-PDF need nothing extra; only
Print-PDF needs a browser **on the worker host**. Two options:

- **System Chromium (recommended for the droplet):**
  `apt-get install -y chromium-browser` (or `chromium`), then set
  `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser` in the worker env. The
  worker launches it with `--no-sandbox` already.
- **Puppeteer-managed Chromium:** flip `puppeteer: true` in `pnpm-workspace.yaml`
  (currently `false` so installs don't pull ~170 MB) and re-run
  `pnpm install`; puppeteer downloads a pinned Chromium. Needs the extra disk +
  the usual headless system libs (`libnss3 libatk-bridge2.0-0 libdrm2 libgbm1
  libasound2 …`).

If neither is present the Print-PDF job fails with a clear message; the other
exports are unaffected. (The on-screen paginated/flip preview uses paged.js in the
browser and needs nothing server-side.)

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
