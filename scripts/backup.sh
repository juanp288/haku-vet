#!/bin/sh
set -euo pipefail
STAMP=$(date +%Y%m%d-%H%M)
pg_dump -h db -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc \
  > "/backups/db-$STAMP.dump"
tar czf "/backups/storage-$STAMP.tar.gz" -C /data storage
find /backups -name 'db-*.dump'        -mtime +14 -delete
find /backups -name 'storage-*.tar.gz' -mtime +14 -delete
echo "$(date -Iseconds) backup ok $STAMP" >> /backups/backup.log
