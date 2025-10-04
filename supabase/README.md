# Supabase RLS Security - Fixed

## What Was Fixed

### ✅ RLS Policies Secured
- **DELETE operations**: Only `service_role` can delete (cache bombing prevented)
- **READ operations**: Public can read non-expired cache
- **WRITE operations**: Public can insert/update with validation
- **TTL enforcement**: Max 7 days (search), 30 days (location)

### ✅ Cleanup Function
- Deletes cache entries where ALL events have passed (checks `startDate` in JSON)
- Run manually from backend: `supabase.rpc('clean_expired_cache').execute()`

### ✅ Anti-Spam Protection
- Max 10k rows in `search_results` (auto-deletes oldest)
- Max 5k rows in `location_cache` (auto-deletes oldest)
- Max 1MB JSON payload size

## Files

```
supabase/
├── migrations/
│   ├── 001_initial_schema.sql       # Tables + cleanup function
│   ├── 002_rls_policies.sql         # Secure RLS (NO public delete)
│   └── 003_security_monitoring.sql  # Anti-spam + monitoring
├── functions/
│   └── merge-cache/index.ts         # Edge function (fixed table names)
├── AGENTS.md                         # Security best practices
└── README.md                         # This file
```

## Environment Variables

Set in `.env`:
```bash
SUPABASE_URL=https://uqvwaiexsgprdbdecoxx.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-key>
SUPABASE_ACCESS_TOKEN=<your-access-token>
```

## Deployment

**Option 1: Supabase Dashboard (Recommended)**
1. Go to https://app.supabase.com/project/uqvwaiexsgprdbdecoxx/sql/new
2. Run each migration file in order (001, 002, 003)

**Option 2: CLI**
```bash
export SUPABASE_ACCESS_TOKEN=<your-token>
supabase login
supabase link --project-ref uqvwaiexsgprdbdecoxx
supabase db push
```

## Verification

After deployment, test RLS:
```bash
# Should work (read)
curl "https://uqvwaiexsgprdbdecoxx.supabase.co/rest/v1/search_results?limit=1" \
  -H "apikey: $SUPABASE_ANON_KEY"

# Should FAIL (delete blocked by RLS)
curl -X DELETE "https://uqvwaiexsgprdbdecoxx.supabase.co/rest/v1/search_results?id=eq.xxx" \
  -H "apikey: $SUPABASE_ANON_KEY"
```

## Manual Cleanup

Call from backend (Python):
```python
from supabase import create_client

supabase = create_client(url, service_role_key)
supabase.rpc('clean_expired_cache').execute()
```

Schedule this daily/weekly as needed.
