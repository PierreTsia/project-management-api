#!/bin/bash

# Check the status of the PR preview database
# Usage: ./scripts/preview-db-status.sh

set -e

echo "📊 Checking PR preview database status..."

# Get detailed status
fly status -a red-cloud-4808

echo ""
echo "🔍 Health Check Details:"

# Get machine ID
MACHINE_ID=$(fly status -a red-cloud-4808 --json | jq -r '.Machines[0].id' 2>/dev/null || echo "")

if [ -n "$MACHINE_ID" ]; then
    echo "📋 Machine ID: $MACHINE_ID"
    
    # Get detailed health checks
    STATUS_JSON=$(fly status -a red-cloud-4808 --json 2>/dev/null)
    
    # Check each health check
    echo ""
    echo "🏥 Individual Checks:"
    
    # App status
    APP_STATUS=$(echo "$STATUS_JSON" | jq -r '.Status' 2>/dev/null || echo "unknown")
    echo "   App Status: $APP_STATUS"
    
    # Machine checks
    CHECKS=$(echo "$STATUS_JSON" | jq -r '.Machines[0].checks[] | "\(.name): \(.status)"' 2>/dev/null || echo "")
    
    if [ -n "$CHECKS" ]; then
        echo "$CHECKS" | while IFS= read -r check; do
            echo "   $check"
        done
    else
        echo "   No health checks available"
    fi
    
    # Check if database is healthy
    ROLE_STATUS=$(echo "$STATUS_JSON" | jq -r '.Machines[0].checks[] | select(.name=="role") | .status' 2>/dev/null || echo "unknown")
    
    echo ""
    if [ "$APP_STATUS" = "deployed" ] && [ "$ROLE_STATUS" = "passing" ]; then
        echo "✅ Database is healthy and ready!"
    else
        echo "⚠️  Database has issues:"
        if [ "$ROLE_STATUS" != "passing" ]; then
            echo "   - Role check is failing (leader election issue)"
            echo "   💡 Try: fly machines restart $MACHINE_ID -a red-cloud-4808"
        fi
        if [ "$APP_STATUS" != "deployed" ]; then
            echo "   - App is not deployed"
            echo "   💡 Try: fly pg restart -a red-cloud-4808"
        fi
    fi
else
    echo "❌ No machine found for PR preview database"
    echo "💡 The database may not exist or be stopped"
fi

echo ""
echo "🔗 Useful Commands:"
echo "   Check logs: fly logs -a red-cloud-4808"
echo "   Restart machine: fly machines restart $MACHINE_ID -a red-cloud-4808"
echo "   Restart database: fly pg restart -a red-cloud-4808"
echo "   Dashboard: https://fly.io/apps/red-cloud-4808" 