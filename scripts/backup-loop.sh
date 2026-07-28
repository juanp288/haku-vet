#!/bin/sh
# Corre en el contenedor `backup`. Duerme hasta las 22:00 (hora del
# contenedor, fijada a America/Bogota) y ejecuta backup.sh cada día.
set -eu

while true; do
  now_h=$(date +%H)
  now_m=$(date +%M)
  if [ "$now_h" = "22" ] && [ "$now_m" = "00" ]; then
    sh /scripts/backup.sh || echo "$(date -Iseconds) backup FALLÓ" >> /backups/backup.log
    sleep 60
  fi
  sleep 30
done
