#!/bin/bash

# Start the PR preview database for Fly.io review apps
# Usage: ./scripts/start-preview-db.sh

set -e

echo "🔄 Starting PR preview database..."

# Check if database is already running
if fly status -a red-cloud-4808 --json | jq -e '.Status == "running"' > /dev/null 2>&1; then
    echo "✅ PR preview database is already running"
    exit 0
fi

echo "🚀 Starting PR preview database (this may take a few minutes)..."
fly pg restart -a red-cloud-4808

echo "⏳ Waiting for PR preview database to be ready..."
# Wait for database to be healthy
for i in {1..30}; do
    if fly status -a red-cloud-4808 --json | jq -e '.Status == "running"' > /dev/null 2>&1; then
        echo "✅ PR preview database is now running and ready!"
        exit 0
    fi
    echo "Waiting... ($i/30)"
    sleep 10
done

echo "⚠️  PR preview database may still be starting up. Check with: fly status -a red-cloud-4808" 