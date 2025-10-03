#!/bin/bash

PROJECT_URL="https://uqvwaiexsgprdbdecoxx.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxdndhaWV4c2dwcmRiZGVjb3h4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NTQ4NjcsImV4cCI6MjA3MjEzMDg2N30.Udcrl-hf4A-Hwf-6Yn1vLkcsvudXWCjEoAgq4N2iP8s"

echo "⏳ Waiting for PostgREST to reload schema cache..."
echo ""

MAX_ATTEMPTS=20
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  ATTEMPT=$((ATTEMPT + 1))
  echo "Attempt $ATTEMPT/$MAX_ATTEMPTS..."
  
  RESPONSE=$(curl -s "$PROJECT_URL/rest/v1/search_results?limit=1" \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $ANON_KEY")
  
  if echo "$RESPONSE" | grep -q "PGRST002"; then
    echo "Still loading..."
    sleep 3
  elif echo "$RESPONSE" | grep -q "PGRST"; then
    echo "Error: $RESPONSE"
    exit 1
  else
    echo "✅ Schema loaded!"
    echo ""
    bash test-security.sh
    exit 0
  fi
done

echo "❌ Timeout waiting for schema to load"
exit 1
