#!/usr/bin/env bash
# Cleanup script to remove old JS backend files

set -e

cd "$(dirname "$0")/.."

echo "🧹 Cleaning up old JS backend files..."

# Remove old JS files from backend/
rm -f backend/src/index.js
rm -rf backend/src/routes
rm -rf backend/test
rm -f backend/vitest.config.js
rm -f backend/package.json
rm -f backend/Dockerfile
rm -f backend/example-backend-ui.json
rm -f backend/.env.example

# Remove backend-python directory if it exists
if [ -d backend-python ]; then
    rm -rf backend-python
    echo "✅ Removed backend-python directory"
fi

echo "✅ Cleanup complete!"
echo ""
echo "Backend structure:"
ls -la backend/
