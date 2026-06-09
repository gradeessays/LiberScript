# Production image for the BullMQ worker (parse / analyze / export jobs).
# Includes Chromium so the interior Print-PDF export works; the rest of the
# exports need nothing extra. Build context is the monorepo root:
#   docker build -f apps/worker/Dockerfile .
# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
# openssl: Prisma engine. chromium + fonts: paged.js Print-PDF rendering.
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
     openssl ca-certificates chromium \
     fonts-liberation fonts-dejavu fonts-noto-core \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app

# Use the system Chromium rather than puppeteer's bundled one.
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Install with dev deps too — the worker runs on tsx (a devDependency). NODE_ENV
# is provided at runtime by the compose env_file, not baked in (so it isn't
# treated as a prod-only install).
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @liberscript/db generate

# The worker runs its TypeScript directly with tsx; env comes from the container.
CMD ["pnpm", "--filter", "@liberscript/worker", "exec", "tsx", "src/index.ts"]
