#!/usr/bin/env bash
# ==============================================================================
# 📦 Litmus Production MongoDB Automated S3 Backup Script
# ==============================================================================
# Schedule via Crontab (e.g., every day at 02:00 AM UTC):
# 0 2 * * * /opt/litmus-deployment/backend/scripts/backup-mongo-to-s3.sh >> /var/log/mongo-backup.log 2>&1
# ==============================================================================

set -euo pipefail

# ── Load Environment Variables ────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env"

if [ -f "$ENV_FILE" ]; then
  # Export variables from .env
  set -a
  source "$ENV_FILE"
  set +a
else
  echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] ❌ ERROR: .env file not found at $ENV_FILE"
  exit 1
fi

# ── Configuration & Defaults ─────────────────────────────────────────────────
BACKUP_DIR="${BACKUP_DIR:-/tmp/mongo-backups}"
TIMESTAMP=$(date -u +"%Y%m%d_%H%M%S")
BACKUP_FILENAME="litmus_mongo_backup_${TIMESTAMP}.gz"
BACKUP_FILEPATH="${BACKUP_DIR}/${BACKUP_FILENAME}"

MONGO_CONTAINER="${MONGO_CONTAINER:-litmus_prod_mongodb}"
MONGO_DB="${MONGO_DB:-litmus_production}"
MONGO_USER="${MONGO_ROOT_USER:-admin}"
MONGO_PASS="${MONGO_ROOT_PASSWORD:-}"
S3_BUCKET="${AWS_BACKUP_S3_BUCKET:-litmus-production-backups-bucket}"
S3_DESTINATION="s3://${S3_BUCKET}/mongodb/${BACKUP_FILENAME}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

mkdir -p "$BACKUP_DIR"

echo "=================================================================="
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] 🚀 Starting MongoDB Backup"
echo "  Container: $MONGO_CONTAINER"
echo "  Database:  $MONGO_DB"
echo "  Target S3: $S3_DESTINATION"
echo "=================================================================="

# ── Step 1: Dump & Gzip MongoDB Database ─────────────────────────────────────
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] 📥 Dumping MongoDB database..."

if [ -n "$MONGO_PASS" ]; then
  docker exec "$MONGO_CONTAINER" mongodump \
    --username "$MONGO_USER" \
    --password "$MONGO_PASS" \
    --authenticationDatabase admin \
    --db "$MONGO_DB" \
    --archive --gzip > "$BACKUP_FILEPATH"
else
  docker exec "$MONGO_CONTAINER" mongodump \
    --db "$MONGO_DB" \
    --archive --gzip > "$BACKUP_FILEPATH"
fi

BACKUP_SIZE=$(du -h "$BACKUP_FILEPATH" | cut -f1)
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] ✅ Backup archive created ($BACKUP_SIZE): $BACKUP_FILEPATH"

# ── Step 2: Upload Archive to AWS S3 ──────────────────────────────────────────
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] ☁️ Uploading to AWS S3..."
aws s3 cp "$BACKUP_FILEPATH" "$S3_DESTINATION" --sse AES256

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] ✅ Successfully uploaded to $S3_DESTINATION"

# ── Step 3: Prune Local Backups Older Than 3 Days ────────────────────────────
find "$BACKUP_DIR" -name "litmus_mongo_backup_*.gz" -type f -mtime +3 -delete
echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] 🧹 Local cleanup completed."

# ── Step 4: Optional Lifecycle / Remote Prune ────────────────────────────────
# (AWS S3 Lifecycle Rule will automatically expire files older than 30 days)

echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] 🎉 Backup completed successfully!"
