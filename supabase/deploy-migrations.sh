#!/bin/bash
set -e

PROJECT_REF="uqvwaiexsgprdbdecoxx"
ACCESS_TOKEN="sbp_dadedc8aeaa73d0f76b8d6f71a34e9d6bae98e3c"
API_URL="https://api.supabase.com/v1/projects/$PROJECT_REF/database/query"

echo "🚀 Executing migrations via Management API..."
echo ""

# Function to execute SQL
execute_sql() {
  local sql_file=$1
  local description=$2
  
  echo "📝 $description..."
  
  SQL_CONTENT=$(cat "$sql_file")
  JSON_PAYLOAD=$(jq -n --arg sql "$SQL_CONTENT" '{query: $sql}')
  
  RESPONSE=$(curl -s -X POST "$API_URL" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$JSON_PAYLOAD")
  
  if echo "$RESPONSE" | grep -q '"error"'; then
    echo "❌ Failed: $RESPONSE"
    exit 1
  else
    echo "✅ Success"
  fi
}

# Execute migrations in order
execute_sql "migrations/001_initial_schema.sql" "Creating tables and cleanup function"
execute_sql "migrations/002_rls_policies.sql" "Applying secure RLS policies"
execute_sql "migrations/003_security_monitoring.sql" "Adding anti-spam protection"

echo ""
echo "✅ All migrations complete!"
echo ""
echo "Testing security..."
bash test-security.sh
