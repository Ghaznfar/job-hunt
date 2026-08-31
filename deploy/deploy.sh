#!/usr/bin/env bash
# Run on the VM from ~/jobhunt on every release.
set -euo pipefail
cd "$(dirname "$0")"

COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.prod"

echo ">> Pulling latest image"
$COMPOSE pull app

echo ">> Starting DB (idempotent)"
$COMPOSE up -d db
sleep 5

echo ">> Applying migrations"
$COMPOSE run --rm app node_modules/.bin/prisma migrate deploy

# Seed the skill catalogue + job sources on first deploy only (safe/idempotent
# via upserts; comment out after the first run if you don't want demo jobs).
if [ "${SEED:-0}" = "1" ]; then
  echo ">> Seeding"
  $COMPOSE run --rm app node_modules/.bin/tsx prisma/seed.ts
fi

echo ">> Bringing up app + caddy"
$COMPOSE up -d

echo ">> Health"
sleep 5
$COMPOSE exec -T app node -e "fetch('http://localhost:3000/api/health').then(r=>r.json()).then(j=>{console.log(j);process.exit(j.status==='ok'?0:1)})"

echo ">> Pruning old images"
docker image prune -f
echo ">> Deployed."
