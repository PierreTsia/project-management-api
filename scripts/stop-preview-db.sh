#!/bin/bash

# Stop the PR preview database for Fly.io review apps
# Usage: ./scripts/stop-preview-db.sh

set -e

echo "🔄 Stopping PR preview database..."

# Check if database is running
if ! fly status -a red-cloud-4808 --json | jq -e '.Status == "running"' > /dev/null 2>&1; then
    echo "✅ PR preview database is already stopped"
    exit 0
fi

echo "🛑 Stopping PR preview database..."
fly scale count 0 -a red-cloud-4808

echo "✅ PR preview database stopped successfully" 