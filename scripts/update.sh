#!/bin/sh
set -euo pipefail

git pull
docker compose build
docker compose run --rm api pnpm --filter @vetclinic/db exec prisma migrate deploy
docker compose up -d

echo "Actualización completa."
