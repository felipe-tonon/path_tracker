#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Path Tracker - Cloud SQL Database Initialization Script
# ═══════════════════════════════════════════════════════════════
# This script initializes the Cloud SQL database schema.
# Prerequisites:
#   - Cloud SQL Proxy running or psql installed
#   - gcloud authenticated with appropriate permissions
#
# Usage:
#   ./scripts/cloud-db-init.sh
# ═══════════════════════════════════════════════════════════════

set -e

PROJECT_ID="path-tracker-484312"
INSTANCE_NAME="pathtracker-db"
DATABASE="pathtracker"
USER="pathtracker"
REGION="europe-west1"

echo "═══════════════════════════════════════════════════════════════"
echo "  Path Tracker - Database Initialization"
echo "═══════════════════════════════════════════════════════════════"

# Check if running with Cloud SQL Proxy
if [ -n "$CLOUD_SQL_PROXY" ]; then
    echo "Using Cloud SQL Proxy connection..."
    PGPASSWORD="PathTrackerDB2026!" psql -h localhost -p 5432 -U $USER -d $DATABASE < scripts/init-db.sql
else
    echo "Using gcloud sql connect..."
    echo "Note: This requires psql to be installed."
    echo ""
    echo "If you don't have psql, you can:"
    echo "  1. Install PostgreSQL client: brew install postgresql"
    echo "  2. Use Cloud Shell: https://console.cloud.google.com/sql/instances/${INSTANCE_NAME}/overview?project=${PROJECT_ID}"
    echo "     Then click 'Connect using Cloud Shell' and run:"
    echo "     psql -d pathtracker < init-db.sql"
    echo ""
    gcloud sql connect $INSTANCE_NAME --user=$USER --database=$DATABASE < scripts/init-db.sql
fi

echo ""
echo "✅ Database schema initialized successfully!"
