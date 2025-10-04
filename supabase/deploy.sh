#!/bin/bash
# Supabase deployment script using environment variables
# Usage: Set SUPABASE_ACCESS_TOKEN in your shell, then run ./deploy.sh

set -e

if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  if [ -f "../.env" ]; then
    export $(grep SUPABASE_ACCESS_TOKEN ../.env | xargs)
  fi
fi

if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo "Error: SUPABASE_ACCESS_TOKEN not set"
  echo "Set it in .env or export it: export SUPABASE_ACCESS_TOKEN=your_token"
  exit 1
fi

echo "🚀 Deploying Supabase migrations..."
cd "$(dirname "$0")"

echo "y" | npx supabase db reset --linked

echo ""
echo "✅ Migrations applied!"
echo ""
echo "⚠️  PostgREST may need manual restart:"
echo "  1. Go to https://app.supabase.com/project/uqvwaiexsgprdbdecoxx/settings/general"
echo "  2. Click 'Pause project' at bottom"
echo "  3. Wait 30 seconds"
echo "  4. Click 'Resume project'"
echo "  5. Run: python3 test_security.py"

