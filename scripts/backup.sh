#!/usr/bin/env bash
# Pro FundX PostgreSQL Database Backup Script
# Usage: ./scripts/backup.sh [output_dir]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# ── Load .env ─────────────────────────────────────────────────
if [ -f "$PROJECT_DIR/.env" ]; then
  set -a
  source "$PROJECT_DIR/.env"
  set +a
fi

# ── Config ────────────────────────────────────────────────────
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-pro-fundx}"
DB_USER="${DB_USER:-pro-fundx}"
DB_PASSWORD="${DB_PASSWORD:-pro-fundx123}"
BACKUP_DIR="${1:-$PROJECT_DIR/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/pro-fundx_${TIMESTAMP}.sql.gz"
BACKUP_INFO="${BACKUP_DIR}/pro-fundx_${TIMESTAMP}.info"

mkdir -p "$BACKUP_DIR"

# ── Pre-flight checks ─────────────────────────────────────────
if ! command -v pg_dump &>/dev/null; then
  echo "ERROR: pg_dump not found. Install PostgreSQL client tools."
  exit 1
fi

# ── Run backup ────────────────────────────────────────────────
echo "=========================================="
echo " Pro FundX Database Backup"
echo " Timestamp: $TIMESTAMP"
echo " Database:  $DB_NAME@$DB_HOST:$DB_PORT"
echo " Output:    $BACKUP_FILE"
echo "=========================================="

export PGPASSWORD="$DB_PASSWORD"

pg_dump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --dbname="$DB_NAME" \
  --format=custom \
  --verbose \
  --no-owner \
  --no-acl \
  2>"$BACKUP_INFO" | gzip > "$BACKUP_FILE"

BACKUP_SIZE=$(stat -c%s "$BACKUP_FILE" 2>/dev/null || stat -f%z "$BACKUP_FILE" 2>/dev/null)
echo " Backup complete: $(numfmt --to=iec-i 2>/dev/null || echo "$BACKUP_SIZE bytes")"

# ── Cleanup old backups ───────────────────────────────────────
if [ "$RETENTION_DAYS" -gt 0 ]; then
  find "$BACKUP_DIR" -name "pro-fundx_*.sql.gz" -type f -mtime "+$RETENTION_DAYS" -delete
  find "$BACKUP_DIR" -name "pro-fundx_*.info" -type f -mtime "+$RETENTION_DAYS" -delete
  echo " Cleaned up backups older than $RETENTION_DAYS days"
fi

echo "=========================================="
