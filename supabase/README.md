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

## 🚀 Quick Deploy (2 minutes)

### Option 1: SQL Editor (Easiest - No CLI Required)

1. **Open Supabase SQL Editor**: https://app.supabase.com/project/uqvwaiexsgprdbdecoxx/sql/new
2. **Copy migration**: Open `supabase/complete-migration.sql` and copy all contents
3. **Paste and Run**: Paste into SQL Editor → Click "Run"
4. **Verify**: Run `bash supabase/test-security.sh` in your terminal
5. **Done!** ✅

### Option 2: Supabase CLI (for automation)

```bash
cd supabase
bash deploy.sh
```

Prompts you to:
- Login to Supabase
- Link your project
- Push migrations
- Deploy edge function

### Option 3: Local Development

```bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Start local instance
cd supabase
supabase start

# Apply migrations
supabase db reset

# Get local keys from: supabase status
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

## ✅ Test Security (Required)

After deploying, verify RLS is blocking unauthorized deletes:

```bash
bash supabase/test-security.sh
```

**Expected output:**
```
✅ PASS: Anon read works
✅ PASS: Anon insert works
✅ PASS: Anon delete blocked (HTTP 403) - Security working!
✅ PASS: Service role delete works
```

**If you see failures**, the migration didn't apply. Re-run the SQL in the editor.

## What Changed

| File | Change |
|------|--------|
| `AGENTS.md` | Created - security best practices for agents |
| `migrations/001_initial_schema.sql` | Added automatic cleanup with pg_cron |
| `migrations/002_rls_policies.sql` | **COMPLETE REWRITE** - secure RLS policies |
| `migrations/003_security_monitoring.sql` | Created - spam protection and monitoring |
| `functions/merge-cache/index.ts` | Fixed table names and added validation |

## Next Steps

1. **Deploy migrations** (use SQL Editor option above)
2. **Test security** with `bash supabase/test-security.sh`
3. **Verify env variables** in your backend `.env`:
   ```
   SUPABASE_URL=https://uqvwaiexsgprdbdecoxx.supabase.co
   SUPABASE_ANON_KEY=<your-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
   ```
4. **Restart your backend** to pick up the new config
5. **Monitor cache health**: Query the `cache_health` view in SQL Editor
