# Production image for the Next.js app (standalone output).
# Build context is the monorepo root: `docker build -f apps/web/Dockerfile .`
# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
# OpenSSL is required by the Prisma query engine; ca-certificates for TLS to Neon.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app

FROM base AS build
# The web image never renders PDFs, so skip the Chromium download entirely.
ENV PUPPETEER_SKIP_DOWNLOAD=true
COPY . .
# Persistent caches (BuildKit): pnpm store so installs don't re-download, and
# Next's build cache so `next build` only recompiles what changed. These survive
# even though the COPY layer cache-busts on every commit.
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
RUN pnpm --filter @liberscript/db generate
# V8 auto-caps the heap around ~490MB on a 1GB host, which OOMs partway through
# the build (73 routes incl. 50 guide pages). Raise the ceiling so it can use
# the swap configured on the deploy server instead of crashing.
RUN --mount=type=cache,target=/app/apps/web/.next/cache \
    NODE_OPTIONS="--max-old-space-size=1536" pnpm --filter @liberscript/web build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Self-contained server + static assets traced by `output: 'standalone'`.
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public
# Next's tracer doesn't bundle the Prisma query engine — copy it into the exact
# pnpm path the client searches at runtime.
COPY --from=build /app/node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/.prisma \
     ./node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/.prisma
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
