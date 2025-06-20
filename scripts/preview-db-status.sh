#!/bin/bash

# Check the status of the PR preview database
# Usage: ./scripts/preview-db-status.sh

set -e

echo "📊 Checking PR preview database status..."

# Get detailed status
fly status -a red-cloud-4808

echo ""
echo "🔍 Connection info:"
fly pg connect -a red-cloud-4808 --help 2>/dev/null | head -5 || echo "PR preview database may be stopped" 