#!/bin/sh
# Uso: ./scripts/restore.sh /backups/db-YYYYMMDD-HHMM.dump /backups/storage-YYYYMMDD-HHMM.tar.gz
set -euo pipefail

DB_DUMP="${1:?Falta la ruta al dump de la base de datos}"
STORAGE_TAR="${2:?Falta la ruta al tar.gz de storage}"

echo "Restaurando base de datos desde $DB_DUMP..."
docker compose exec -T db pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists < "$DB_DUMP"

echo "Restaurando storage desde $STORAGE_TAR..."
docker compose run --rm -v "$(pwd)/$STORAGE_TAR:/restore.tar.gz:ro" api \
  sh -c "cd /data && tar xzf /restore.tar.gz"

echo "Restauración completa. Verifica /health antes de dar por buena la copia."
