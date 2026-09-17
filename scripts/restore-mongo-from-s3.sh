#!/usr/bin/env bash
# ==============================================================================
# 🔄 Litmus Production MongoDB Disaster Recovery / Restore Script
# ==============================================================================
# Usage:
#   ./restore-mongo-from-s3.sh <backup_filename_or_s3_uri>
# Example:
#   ./restore-mongo-from-s3.sh litmus_mongo_backup_20260917_020000.gz
# ==============================================================================

set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "❌ Error: Backup filename or S3 path must be provided as the first argument."
  echo "Usage: ./restore-mongo-from-s3.sh <backup_filename_or_s3_uri>"
  echo "Available backups in S3:"
  aws s3 ls "s3://${AWS_BACKUP_S3_BUCKET:-litmus-production-backups-bucket}/mongodb/" | tail -n 10
  exit 1
fi

TARGET_BACKUP="$1"
S3_BUCKET="${AWS_BACKUP_S3_BUCKET:-litmus-production-backups-bucket}"
RESTORE_DIR="/tmp/mongo-restore"
mkdir -p "$RESTORE_DIR"

if [[ "$TARGET_BACKUP" == s3://* ]]; then
  LOCAL_BACKUP_PATH="$RESTORE_DIR/$(basename "$TARGET_BACKUP")"
  S3_URI="$TARGET_BACKUP"
else
  LOCAL_BACKUP_PATH="$RESTORE_DIR/$TARGET_BACKUP"
  S3_URI="s3://${S3_BUCKET}/mongodb/${TARGET_BACKUP}"
fi

echo "=================================================================="
echo "⚠️  DISASTER RECOVERY: Restoring MongoDB Database"
echo "  Source S3: $S3_URI"
echo "  Target File: $LOCAL_BACKUP_PATH"
echo "=================================================================="

# Download from S3
echo "📥 Downloading backup from AWS S3..."
aws s3 cp "$S3_URI" "$LOCAL_BACKUP_PATH"

MONGO_CONTAINER="${MONGO_CONTAINER:-litmus_prod_mongodb}"
MONGO_USER="${MONGO_ROOT_USER:-admin}"
MONGO_PASS="${MONGO_ROOT_PASSWORD:-}"

echo "🔄 Restoring database into container: $MONGO_CONTAINER..."
if [ -n "$MONGO_PASS" ]; then
  cat "$LOCAL_BACKUP_PATH" | docker exec -i "$MONGO_CONTAINER" mongorestore \
    --username "$MONGO_USER" \
    --password "$MONGO_PASS" \
    --authenticationDatabase admin \
    --archive --gzip --drop
else
  cat "$LOCAL_BACKUP_PATH" | docker exec -i "$MONGO_CONTAINER" mongorestore \
    --archive --gzip --drop
fi

echo "✅ Database restored successfully!"
rm -f "$LOCAL_BACKUP_PATH"
