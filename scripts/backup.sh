#!/bin/bash
# 2ndCTO Database Backup Script
# Run daily via cron or scheduled task

set -e

# Configuration
SUPABASE_URL="${SUPABASE_URL:-}"
SUPABASE_SERVICE_KEY="${SUPABASE_SERVICE_KEY:-}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
S3_BUCKET="${S3_BUCKET:-}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
    exit 1
}

# Check dependencies
check_deps() {
    command -v psql >/dev/null 2>&1 || error "psql is required but not installed"
    command -v gzip >/dev/null 2>&1 || error "gzip is required but not installed"
}

# Create backup directory
setup() {
    mkdir -p "$BACKUP_DIR"
    log "Backup directory: $BACKUP_DIR"
}

# Perform database backup
backup_database() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="2ndcto_backup_${timestamp}.sql.gz"
    local backup_path="$BACKUP_DIR/$backup_file"

    log "Starting database backup..."

    # Extract connection details from Supabase URL
    # Format: postgresql://user:pass@host:port/database
    if [[ "$SUPABASE_URL" =~ postgresql://([^:]+):([^@]+)@([^:]+):([0-9]+)/(.+) ]]; then
        local user="${BASH_REMATCH[1]}"
        local password="${BASH_REMATCH[2]}"
        local host="${BASH_REMATCH[3]}"
        local port="${BASH_REMATCH[4]}"
        local database="${BASH_REMATCH[5]}"
    else
        error "Unable to parse SUPABASE_URL"
    fi

    # Perform backup
    export PGPASSWORD="$password"
    if pg_dump \
        -h "$host" \
        -p "$port" \
        -U "$user" \
        -d "$database" \
        --clean \
        --if-exists \
        --verbose \
        2>/dev/null | gzip > "$backup_path"; then

        local size=$(du -h "$backup_path" | cut -f1)
        log "Backup completed: $backup_file ($size)"

        # Upload to S3 if configured
        if [ -n "$S3_BUCKET" ]; then
            upload_to_s3 "$backup_path" "$backup_file"
        fi

        echo "$backup_path"
    else
        error "Database backup failed"
    fi
}

# Upload to S3
upload_to_s3() {
    local file_path="$1"
    local file_name="$2"

    if command -v aws >/dev/null 2>&1; then
        log "Uploading to S3: $S3_BUCKET/backups/"
        aws s3 cp "$file_path" "s3://$S3_BUCKET/backups/$file_name" --storage-class STANDARD_IA
        log "S3 upload completed"
    else
        warn "AWS CLI not found, skipping S3 upload"
    fi
}

# Clean old backups
cleanup_old_backups() {
    log "Cleaning backups older than $RETENTION_DAYS days..."

    local deleted=0
    while IFS= read -r file; do
        rm -f "$file"
        ((deleted++))
    done < <(find "$BACKUP_DIR" -name "2ndcto_backup_*.sql.gz" -mtime +$RETENTION_DAYS)

    log "Deleted $deleted old backup(s)"
}

# Verify backup integrity
verify_backup() {
    local backup_path="$1"

    log "Verifying backup integrity..."

    if gunzip -t "$backup_path" 2>/dev/null; then
        log "Backup integrity verified"
        return 0
    else
        error "Backup integrity check failed"
    fi
}

# Test restore (optional)
test_restore() {
    local backup_path="$1"

    warn "Testing restore (this will create a temporary database)..."

    # This is a simplified check - in production, restore to a test DB
    if zcat "$backup_path" | head -100 | grep -q "CREATE TABLE"; then
        log "Restore test passed (SQL structure validated)"
    else
        error "Restore test failed"
    fi
}

# Send notification
send_notification() {
    local status="$1"
    local message="$2"

    # Slack webhook
    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -s -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"2ndCTO Backup: $status - $message\"}" \
            "$SLACK_WEBHOOK" > /dev/null || warn "Failed to send Slack notification"
    fi

    # Email (if sendmail available)
    if command -v sendmail >/dev/null 2>&1 && [ -n "$ADMIN_EMAIL" ]; then
        echo -e "Subject: 2ndCTO Backup $status\n\n$message" | sendmail "$ADMIN_EMAIL"
    fi
}

# Main
main() {
    log "=== 2ndCTO Backup Started ==="

    check_deps
    setup

    local backup_path
    backup_path=$(backup_database)

    verify_backup "$backup_path"
    # test_restore "$backup_path"  # Uncomment to enable restore testing
    cleanup_old_backups

    log "=== Backup Completed Successfully ==="

    send_notification "SUCCESS" "Backup completed: $(basename $backup_path)"
}

# Run main function
main "$@"
