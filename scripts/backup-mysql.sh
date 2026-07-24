#!/usr/bin/env bash
# Backup MySQL do Aten AI (Docker Compose ou host local).
# Uso:
#   ./scripts/backup-mysql.sh
# Variáveis (opcionais): BACKUP_DIR, RETENTION_DAYS, COMPOSE_SERVICE

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
COMPOSE_SERVICE="${COMPOSE_SERVICE:-mysql}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_FILE="$BACKUP_DIR/aten_ai_${STAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

# Carrega .env da raiz se existir (sem exportar tudo no shell do usuário)
if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
fi

DB_NAME="${DB_NAME:-aten_ai_db}"
DB_USER="${DB_USER:-aten_ai}"
DB_PASS="${DB_PASS:?Defina DB_PASS}"

echo "[backup] Gerando $OUT_FILE ..."

if docker compose -f "$ROOT_DIR/docker-compose.yml" ps --status running "$COMPOSE_SERVICE" 2>/dev/null | grep -q "$COMPOSE_SERVICE"; then
  docker compose -f "$ROOT_DIR/docker-compose.yml" exec -T "$COMPOSE_SERVICE" \
    mysqldump -u"$DB_USER" -p"$DB_PASS" --single-transaction --routines --triggers "$DB_NAME" \
    | gzip -c > "$OUT_FILE"
else
  mysqldump -h"${DB_HOST:-127.0.0.1}" -P"${DB_PORT:-3306}" -u"$DB_USER" -p"$DB_PASS" \
    --single-transaction --routines --triggers "$DB_NAME" \
    | gzip -c > "$OUT_FILE"
fi

echo "[backup] OK ($(du -h "$OUT_FILE" | cut -f1))"

# Retenção
find "$BACKUP_DIR" -type f -name 'aten_ai_*.sql.gz' -mtime +"$RETENTION_DAYS" -print -delete || true
echo "[backup] Retenção: removidos dumps com mais de ${RETENTION_DAYS} dias (se houver)."
