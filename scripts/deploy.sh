#!/usr/bin/env bash
# Build + (re)deploy the production stack. Run from the repo root on the droplet:
#   bash scripts/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE="docker compose -f docker-compose.prod.yml"

if [ ! -f .env.production ]; then
  echo "ERROR: .env.production not found. Copy the template and fill it in:" >&2
  echo "  cp .env.production.example .env.production && nano .env.production" >&2
  exit 1
fi

echo "==> Pulling latest code (origin/main)"
git pull --ff-only origin main

echo "==> Building images (web + worker)"
$COMPOSE build

echo "==> Validating ENCRYPTION_KEY"
$COMPOSE run --rm worker node scripts/ensure-keys.js

echo "==> Applying database migrations (Neon)"
$COMPOSE run --rm worker pnpm db:migrate:prod

echo "==> Starting / updating services"
$COMPOSE up -d

echo "==> Pruning dangling images"
docker image prune -f

echo "==> Status"
$COMPOSE ps
echo
echo "Tail logs with:  $COMPOSE logs -f web worker caddy"
