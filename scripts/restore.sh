#!/usr/bin/env bash
# Pro FundX PostgreSQL Database Restore Script
# Usage: ./scripts/restore.sh <backup_file.sql.gz>
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ -f "$PROJECT_DIR/.env" ]; then
  set -a
  source "$PROJECT_DIR/.env"
  set +a
fi

BACKUP_FILE="${1:-}"
if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup_file.sql.gz>"
  echo "Available backups:"
  ls -1 "$PROJECT_DIR/backups/"*.sql.gz 2>/dev/null || echo "  (none found)"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: File not found: $BACKUP_FILE"
  exit 1
fi

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-pro-fundx}"
DB_USER="${DB_USER:-pro-fundx}"
DB_PASSWORD="${DB_PASSWORD:-pro-fundx123}"

export PGPASSWORD="$DB_PASSWORD"

echo "=========================================="
echo " Pro FundX Database Restore"
echo " Backup:  $BACKUP_FILE"
echo " Target:  $DB_NAME@$DB_HOST:$DB_PORT"
echo "=========================================="
echo "WARNING: This will OVERWRITE the database!"
read -rp "Type 'yes' to continue: " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  exit 1
fi

gunzip -c "$BACKUP_FILE" | pg_restore \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --dbname="$DB_NAME" \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  --verbose

echo "=========================================="
echo " Restore complete!"
echo "=========================================="
