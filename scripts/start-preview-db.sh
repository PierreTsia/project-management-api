#!/bin/bash

# Start the PR preview database for Fly.io review apps
# Usage: ./scripts/start-preview-db.sh

set -e

echo "🔄 Starting PR preview database..."

# Get the machine ID
MACHINE_ID=$(fly status -a red-cloud-4808 --json | jq -r '.Machines[0].id' 2>/dev/null || echo "")

if [ -z "$MACHINE_ID" ]; then
    echo "❌ No machine found for PR preview database"
    echo "💡 Try: fly pg create --name red-cloud-4808"
    exit 1
fi

echo "📋 Machine ID: $MACHINE_ID"

# Check if database is healthy
check_health() {
    local status_output=$(fly status -a red-cloud-4808 --json 2>/dev/null)
    local app_status=$(echo "$status_output" | jq -r '.Status' 2>/dev/null || echo "unknown")
    local role_status=$(echo "$status_output" | jq -r '.Machines[0].checks[] | select(.name=="role") | .status' 2>/dev/null || echo "unknown")
    
    if [ "$app_status" = "deployed" ] && [ "$role_status" = "passing" ]; then
        return 0
    else
        return 1
    fi
}

# Try to start/restart the database
start_database() {
    echo "🚀 Attempting to start PR preview database..."
    
    # First try the standard pg restart
    if fly pg restart -a red-cloud-4808 2>/dev/null; then
        echo "✅ Standard restart successful"
        return 0
    fi
    
    echo "⚠️  Standard restart failed, trying machine restart..."
    
    # If that fails, restart the specific machine
    if fly machines restart "$MACHINE_ID" -a red-cloud-4808 2>/dev/null; then
        echo "✅ Machine restart successful"
        return 0
    fi
    
    echo "❌ Both restart methods failed"
    return 1
}

# Check if already healthy
if check_health; then
    echo "✅ PR preview database is already running and healthy!"
    exit 0
fi

# Try to start the database
if ! start_database; then
    echo "❌ Failed to start PR preview database"
    echo "💡 Manual steps:"
    echo "   1. Check Fly.io dashboard: https://fly.io/apps/red-cloud-4808"
    echo "   2. Try: fly machines restart $MACHINE_ID -a red-cloud-4808"
    echo "   3. Check logs: fly logs -a red-cloud-4808"
    exit 1
fi

echo "⏳ Waiting for PR preview database to be ready..."
# Wait for database to be healthy
for i in {1..30}; do
    if check_health; then
        echo "✅ PR preview database is now running and healthy!"
        exit 0
    fi
    echo "Waiting... ($i/30)"
    sleep 10
done

echo "⚠️  PR preview database may still be starting up."
echo "💡 Check status with: pnpm preview-db:status"
echo "💡 Check logs with: fly logs -a red-cloud-4808" 