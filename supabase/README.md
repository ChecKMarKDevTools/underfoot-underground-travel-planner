# Supabase Security Implementation

## Current Status

### ✅ Completed:
- Migrations applied via Supabase CLI
- RLS policies secure (no more `USING (true)`)  
- Cleanup function checks event dates (only deletes past events)
- Anti-spam triggers prevent database bloat
- Edge function fixed (correct table names)

### ⚠️ Known Issue:
PostgREST schema cache is stuck after `db reset`. Needs manual project pause/resume from dashboard.

## Quick Deploy

```bash
# Set your access token
export SUPABASE_ACCESS_TOKEN=your_token_here

# Or add to .env:
echo "SUPABASE_ACCESS_TOKEN=your_token" >> ../.env

# Deploy
cd supabase
bash deploy.sh
```

## Manual Fix for PostgREST

If API returns `PGRST002` error:

1. Go to https://app.supabase.com/project/uqvwaiexsgprdbdecoxx/settings/general
2. Click "Pause project" (bottom of page)
3. Wait 30 seconds
4. Click "Resume project"  
5. Test: `python3 test_security.py`

## Test Security

```bash
cd supabase
python3 test_security.py
```

Expected results:
- ✅ Anon can read (public cache)
- ✅ Anon can insert (with validation)
- ✅ Anon CANNOT delete (RLS blocks it)
- ✅ Service role can delete (admin only)

## Files

| File | Purpose |
|------|---------|
| `deploy.sh` | Deploy migrations via Supabase CLI (uses env var) |
| `test_security.py` | Python script to verify RLS policies |
| `migrations/001_initial_schema.sql` | Tables + cleanup function |
| `migrations/002_rls_policies.sql` | Secure RLS policies |
| `migrations/003_security_monitoring.sql` | Anti-spam + monitoring |
| `complete-migration.sql` | All-in-one SQL (for SQL Editor) |

## Cleanup

Cleanup is **manual** (pg_cron not available on Supabase Cloud). Call from backend:

```python
from supabase import create_client

supabase = create_client(url, service_role_key)
supabase.rpc('clean_expired_cache').execute()
```

Or trigger via edge function on a schedule.
