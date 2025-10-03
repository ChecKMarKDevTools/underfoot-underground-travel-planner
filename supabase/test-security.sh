#!/bin/bash
# Test RLS policies to verify security is working

PROJECT_URL="https://uqvwaiexsgprdbdecoxx.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxdndhaWV4c2dwcmRiZGVjb3h4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NTQ4NjcsImV4cCI6MjA3MjEzMDg2N30.Udcrl-hf4A-Hwf-6Yn1vLkcsvudXWCjEoAgq4N2iP8s"
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxdndhaWV4c2dwcmRiZGVjb3h4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjU1NDg2NywiZXhwIjoyMDcyMTMwODY3fQ.ge77JtO_vPUmXnQ8mz06w4VoryibGPyjfpiG4ejZieI"

echo "🧪 Testing Supabase RLS Security..."
echo ""

# Test 1: Read with anon key (should work)
echo "Test 1: Reading cache with anon key (should succeed)..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  "$PROJECT_URL/rest/v1/search_results?select=*&limit=1" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY")

if [ "$RESPONSE" = "200" ]; then
  echo "✅ PASS: Anon read works"
else
  echo "❌ FAIL: Anon read failed (HTTP $RESPONSE)"
fi

echo ""

# Test 2: Insert with anon key (should work with valid data)
echo "Test 2: Inserting cache with anon key (should succeed)..."
TEST_HASH="test_$(date +%s)"
EXPIRES_AT=$(date -u -v+1H +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -d "+1 hour" +"%Y-%m-%dT%H:%M:%SZ")

RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  "$PROJECT_URL/rest/v1/search_results" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d "{
    \"query_hash\": \"$TEST_HASH\",
    \"location\": \"Test Location\",
    \"intent\": \"test query\",
    \"results_json\": {},
    \"expires_at\": \"$EXPIRES_AT\"
  }")

if [ "$RESPONSE" = "201" ]; then
  echo "✅ PASS: Anon insert works"
  TEST_ID=$TEST_HASH
else
  echo "❌ FAIL: Anon insert failed (HTTP $RESPONSE)"
fi

echo ""

# Test 3: Delete with anon key (should FAIL - this is the security fix)
echo "Test 3: Deleting cache with anon key (should FAIL - RLS blocks this)..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  "$PROJECT_URL/rest/v1/search_results?query_hash=eq.$TEST_HASH" \
  -X DELETE \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY")

if [ "$RESPONSE" = "401" ] || [ "$RESPONSE" = "403" ]; then
  echo "✅ PASS: Anon delete blocked (HTTP $RESPONSE) - Security working!"
else
  echo "⚠️  WARNING: Anon delete returned HTTP $RESPONSE (expected 401/403)"
  echo "    This might mean RLS isn't enabled or policies aren't applied"
fi

echo ""

# Test 4: Delete with service role key (should work)
echo "Test 4: Deleting cache with service role key (should succeed)..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  "$PROJECT_URL/rest/v1/search_results?query_hash=eq.$TEST_HASH" \
  -X DELETE \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY")

if [ "$RESPONSE" = "204" ] || [ "$RESPONSE" = "200" ]; then
  echo "✅ PASS: Service role delete works"
else
  echo "❌ FAIL: Service role delete failed (HTTP $RESPONSE)"
fi

echo ""
echo "🎉 Security test complete!"
echo ""
echo "Expected results:"
echo "  ✅ Anon can read (public cache)"
echo "  ✅ Anon can insert (controlled writes)"
echo "  ✅ Anon CANNOT delete (prevented by RLS)"
echo "  ✅ Service role can delete (admin operations)"
