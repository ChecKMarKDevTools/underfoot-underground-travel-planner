# Supabase Security Fixes Applied

## What Was Broken

Your original RLS policies had **critical security vulnerabilities**:

1. **Anyone could delete all data**: `USING (true)` = no restrictions
2. **No TTL enforcement**: Could cache data forever
3. **No automatic cleanup**: Expired entries accumulated indefinitely  
4. **No spam protection**: Database could be flooded with garbage
5. **Edge function referenced wrong table**: 'search_cache' doesn't exist

## What Got Fixed

### 1. Secure RLS Policies (`002_rls_policies.sql`)
- **Reads**: Public can read non-expired cache (this is fine, it's a cache)
- **Writes**: Public can insert/update with validation
- **Deletes**: BLOCKED unless using service role key (prevents cache bombing)
- **TTL enforcement**: Can't create entries that expire >7 days (search) or >30 days (location)

### 2. Automatic Cleanup (`001_initial_schema.sql`)
- **pg_cron job**: Runs every hour to purge expired entries
- **No manual intervention needed**: Database cleans itself

### 3. Anti-Spam Protection (`003_security_monitoring.sql`)
- **Row limits**: 
  - search_results max 10k rows (auto-deletes oldest)
  - location_cache max 5k rows (auto-deletes oldest)
- **Payload limits**: JSON results capped at 1MB
- **Monitoring view**: Query `cache_health` to see stats

### 4. Fixed Edge Function (`functions/merge-cache/index.ts`)
- **Correct table names**: Uses 'search_results' and 'location_cache'
- **Input validation**: Checks operation, table, data
- **Proper error handling**: Returns meaningful HTTP status codes

## How to Deploy

### Option 1: Local Supabase (for development)

```bash
# Install Supabase CLI (if not installed)
brew install supabase/tap/supabase

# Start local Supabase
cd supabase
supabase start

# Get your local keys (printed after start)
# Set these in your .env:
# SUPABASE_URL=http://127.0.0.1:54321
# SUPABASE_ANON_KEY=<from supabase start output>
# SUPABASE_SERVICE_ROLE_KEY=<from supabase start output>

# Apply migrations
supabase db reset

# Deploy edge function
supabase functions deploy merge-cache
```

### Option 2: Supabase Cloud (for production)

```bash
# Link to your cloud project
supabase link --project-ref <your-project-id>

# Push migrations
supabase db push

# Deploy edge function
supabase functions deploy merge-cache --no-verify-jwt

# Get your keys from:
# https://app.supabase.com/project/<your-project>/settings/api
```

## Environment Variables Needed

Your backend needs these three:

```bash
SUPABASE_URL=<your-supabase-url>
SUPABASE_ANON_KEY=<public-key-safe-for-frontend>
SUPABASE_SERVICE_ROLE_KEY=<admin-key-backend-only-never-expose>
```

**Where to get them**:
- **Local**: Run `supabase status` after `supabase start`
- **Cloud**: Project Settings → API in Supabase dashboard

## Verification

After deploying, test that RLS is working:

```bash
# This should work (read with anon key)
curl -X GET '<SUPABASE_URL>/rest/v1/search_results' \
  -H "apikey: <ANON_KEY>" \
  -H "Authorization: Bearer <ANON_KEY>"

# This should FAIL with 403 (delete with anon key)
curl -X DELETE '<SUPABASE_URL>/rest/v1/search_results?id=eq.<some-id>' \
  -H "apikey: <ANON_KEY>" \
  -H "Authorization: Bearer <ANON_KEY>"

# This should work (delete with service role key)
curl -X DELETE '<SUPABASE_URL>/rest/v1/search_results?id=eq.<some-id>' \
  -H "apikey: <SERVICE_ROLE_KEY>" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>"
```

## What Changed

| File | Change |
|------|--------|
| `AGENTS.md` | Created - security best practices for agents |
| `migrations/001_initial_schema.sql` | Added automatic cleanup with pg_cron |
| `migrations/002_rls_policies.sql` | **COMPLETE REWRITE** - secure RLS policies |
| `migrations/003_security_monitoring.sql` | Created - spam protection and monitoring |
| `functions/merge-cache/index.ts` | Fixed table names and added validation |

## Next Steps

1. **Install Supabase CLI**: `brew install supabase/tap/supabase`
2. **Choose local or cloud deployment** (see above)
3. **Apply migrations**: `supabase db reset` (local) or `supabase db push` (cloud)
4. **Set environment variables** in your backend
5. **Test the security** using the verification commands
