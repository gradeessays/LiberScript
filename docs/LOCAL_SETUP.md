# Local setup (no Docker required)

This gets Liberscript running on your machine end-to-end. Storage and email use
**zero-infra dev drivers**, so the only external services you need are a
**Postgres database** and a **Redis instance** — both available free in the cloud
(no installs) or natively on a local server.

## What each piece uses locally

| Concern | Local dev default | Why |
|---|---|---|
| Database | **Postgres** (Neon free tier, or native) | Real relational DB; matches prod |
| Queue | **Redis** (Upstash free tier, or native) | BullMQ background jobs |
| File storage | **`local` driver** → `.data/uploads` on disk | No MinIO/Spaces/**Cloudinary**/Docker needed |
| Email | **`log` driver** → links printed to console | No MailHog/SMTP needed |

> **Why not Cloudinary for files?** It's an image/video service and isn't
> S3-compatible, so it doesn't fit our storage layer. Locally we use disk; in
> production we use **DigitalOcean Spaces** (S3-compatible). One interface, two
> drivers — no Cloudinary needed.

## 0. Prerequisites
- **Node 20+** and **pnpm** (`corepack enable` then `corepack use pnpm@latest`).
- That's it — no Docker.

## 1. Install dependencies
```bash
pnpm install
```

## 2. Get a Postgres database (pick one)

**Option A — Neon (recommended, free, no install)**
1. Create a project at neon.tech and a database named `liberscript`.
2. Copy the connection string (it already includes `?sslmode=require`).
3. Put it in `.env` as `DATABASE_URL`.

**Option B — Native Postgres (local server box)**
1. Install Postgres (or use an existing server). Create a DB + user:
   ```sql
   CREATE DATABASE liberscript;
   CREATE USER liberscript WITH PASSWORD 'liberscript';
   GRANT ALL PRIVILEGES ON DATABASE liberscript TO liberscript;
   ```
2. `DATABASE_URL=postgresql://liberscript:liberscript@HOST:5432/liberscript?schema=public`

**Inspect the DB** with a GUI — **TablePlus, DBeaver, pgAdmin, or Postico**
(the Postgres equivalents of Mongo Compass) — or run `pnpm db:studio`.

## 3. Get a Redis instance (pick one)

**Option A — Upstash (recommended, free, no install)**
- Create a Redis database, copy the **`rediss://`** URL → `REDIS_URL`.

**Option B — Native** — Memurai (Windows), Redis via WSL2, or any reachable
Redis: `REDIS_URL=redis://HOST:6379`.

## 4. Configure `.env`
A `.env` already exists with sensible defaults. Set these:
```ini
DATABASE_URL=...          # from step 2
REDIS_URL=...             # from step 3
AUTH_SECRET=...           # see below
ENCRYPTION_KEY=...        # see below (base64, 32 bytes)
STORAGE_DRIVER=local      # disk storage, no service needed
MAIL_DRIVER=log           # emails print to the console
```
Generate the two secrets (works on Windows without OpenSSL):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```
Run it twice — once for `AUTH_SECRET`, once for `ENCRYPTION_KEY`.

## 5. Set up the database
```bash
pnpm db:generate         # Prisma client
pnpm db:migrate:deploy   # apply existing migrations — creates all tables
pnpm db:seed             # reference data (publishing platform profiles)
```
> Use `db:migrate:deploy` for setup: it applies the committed migrations with no
> shadow database, which is what managed Postgres (Neon) wants. Only use
> `pnpm db:migrate` (`migrate dev`) when you're **changing the schema** and need
> to author a new migration.
>
> **Neon note:** the free compute auto-suspends; the *first* command after idle
> can fail with `P1001` while it wakes — just re-run it.

## 6. Run it
```bash
pnpm dev              # starts the web app + the worker together
```
- App: http://localhost:3000
- Health: http://localhost:3000/api/health · Readiness: `/api/ready`

## 7. Walk the golden path
1. Go to `/sign-up`, create an account.
2. **Check your terminal** — the verification link is printed there
   (`📧 [email:log] …`). Open it to verify.
3. Sign in → you land on the dashboard.
4. Create a book, open it, **upload a manuscript** (`.docx`/`.epub`/`.pdf`/`.md`/
   `.txt`). The file is written to `.data/uploads`; the worker parses it and the
   page updates with detected chapters + word counts.
5. Create a **team** under *Team*, invite an email — the invite link prints to the
   terminal too. Switch workspaces from the header.

## Switching toward production
- **Storage → DO Spaces:** set `STORAGE_DRIVER=s3` and the `S3_*` values
  (`S3_ENDPOINT=https://<region>.digitaloceanspaces.com`, `S3_FORCE_PATH_STYLE=false`).
- **Email → real delivery:** set `MAIL_DRIVER=smtp` and the `SMTP_*` values
  (MailHog locally, or Postmark/SES in prod).
- See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for the full DigitalOcean topology.

## Troubleshooting
- **`Invalid environment configuration`** — a required var is missing/blank.
  The error lists exactly which ones.
- **DB connection refused / SSL** — managed Postgres needs `?sslmode=require`.
- **Redis timeouts** — managed Redis needs the TLS scheme `rediss://`.
- **Uploads 403** — the signed URL expired (10 min); retry the upload.
