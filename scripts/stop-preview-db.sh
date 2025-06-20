#!/bin/bash

# Stop the PR preview database for Fly.io review apps
# Usage: ./scripts/stop-preview-db.sh

set -e

echo "🔄 Stopping PR preview database..."

# Get the machine ID
MACHINE_ID=$(fly status -a red-cloud-4808 --json | jq -r '.Machines[0].id' 2>/dev/null || echo "")

if [ -z "$MACHINE_ID" ]; then
    echo "✅ PR preview database is already stopped or doesn't exist"
    exit 0
fi

echo "📋 Machine ID: $MACHINE_ID"

# Check current status
STATUS_JSON=$(fly status -a red-cloud-4808 --json 2>/dev/null)
MACHINE_STATE=$(echo "$STATUS_JSON" | jq -r '.Machines[0].state' 2>/dev/null || echo "unknown")

if [ "$MACHINE_STATE" = "stopped" ]; then
    echo "✅ PR preview database is already stopped"
    exit 0
fi

echo "🛑 Stopping PR preview database..."

# For unmanaged Postgres, we need to stop the machine
if fly machines stop "$MACHINE_ID" -a red-cloud-4808 2>/dev/null; then
    echo "✅ PR preview database stopped successfully"
else
    echo "⚠️  Failed to stop database gracefully"
    echo "💡 You can force stop it from the Fly.io dashboard:"
    echo "   https://fly.io/apps/red-cloud-4808"
    exit 1
fi 