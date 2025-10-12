# Supabase RLS Security - Fixed

## What Was Fixed

### ⚠️ RLS Policies (Pre-Beta)

- **ALL operations**: Public access enabled (anon + authenticated)
- **READ/WRITE/DELETE**: Unrestricted for prototyping
- **TODO**: Lock down for production (see migration comments)
- **Expiration**: Event-based for API results, TTL for location/semantic cache

### ✅ Cleanup Function

- Deletes cache entries where ALL events have passed (checks `startDate` in JSON)
- Run manually from backend: `supabase.rpc('clean_expired_cache').execute()`

### ✅ Vector Search Enabled

- pgvector extension for semantic similarity (1536-dim embeddings)
- earthdistance for geographic radius filtering
- 77% similarity threshold, 80-mile max distance
- Exponential distance decay (0mi=1.0, 40mi=0.75, 80mi=0.0)

## Files

```
supabase/
├── migrations/
│   ├── 20251008181641_enable_extensions.sql  # Enable pgvector + earthdistance
│   ├── 20251008181642_create_schema.sql      # Tables (api_results_cache, location_cache, semantic_cache)
│   ├── 20251008181643_create_functions.sql   # Functions (find_similar_intents_nearby, cleanup, stats)
│   └── 20251008181644_rls_policies.sql       # RLS policies (public access for pre-beta)
├── functions/
│   └── merge-cache/index.ts                  # Edge function for cache operations
├── AGENTS.md                                  # Implementation guide (project-specific)
└── README.md                                  # This file
```

## Environment Variables

Set in `.env`:

```bash
SUPABASE_URL=https://uqvwaiexsgprdbdecoxx.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-key>
SUPABASE_ACCESS_TOKEN=<your-access-token>
```

## Quick Start (Local Development)

```bash
# Start local Supabase (Docker required)
supabase start

# Apply all migrations
supabase db reset

# Get local connection details
supabase status
# Copy API URL → SUPABASE_URL
# Copy anon key → SUPABASE_ANON_KEY
# Copy service_role key → SUPABASE_SERVICE_ROLE_KEY

# Verify vector extension
psql postgresql://postgres:postgres@localhost:54322/postgres -c "SELECT extname FROM pg_extension WHERE extname = 'vector';"
```

## Deployment

**Option 1: Supabase Dashboard (Recommended)**

1. Go to <https://app.supabase.com/project/uqvwaiexsgprdbdecoxx/sql/new>
2. Run each migration file in order:
   - `20251008181641_enable_extensions.sql`
   - `20251008181642_create_schema.sql`
   - `20251008181643_create_functions.sql`
   - `20251008181644_rls_policies.sql`

**Option 2: CLI**

```bash
export SUPABASE_ACCESS_TOKEN=<your-token>
supabase login
supabase link --project-ref uqvwaiexsgprdbdecoxx
supabase db push
```

## Verification

After deployment, test access:

```bash
# Should work (read from api_results_cache)
curl "https://uqvwaiexsgprdbdecoxx.supabase.co/rest/v1/api_results_cache?limit=1" \
  -H "apikey: $SUPABASE_ANON_KEY"

# Should work (public delete allowed in pre-beta)
curl -X DELETE "https://uqvwaiexsgprdbdecoxx.supabase.co/rest/v1/api_results_cache?id=eq.xxx" \
  -H "apikey: $SUPABASE_ANON_KEY"

# TODO: Lock down RLS before production (DELETE should fail with anon key)
```

## Cache Strategy

This Supabase setup supports a **tiered vector search** with geographic filtering:

### Tables

- **`api_results_cache`**: Raw API responses (Reddit, SERP, etc.) — expires when `event_date < now()`
- **`location_cache`**: Geocoding normalization with confidence scores — 24hr TTL
- **`semantic_cache`**: Vector embeddings + geo coords — references `api_results_cache.id`

### Search Flow (Tiered Radius Expansion)

1. **Tier A (10mi)**: Check semantic cache for 77%+ similar intent within 10 miles
2. **Tier B (20mi)**: If <3 results, expand to 20 miles
3. **Tier C (40mi)**: If still <3, expand to 40 miles (max 80mi hard cutoff)
4. **Scoring**: 70% intent similarity + 30% proximity (exponential distance decay)

### Key Functions

- `find_similar_intents_nearby(embedding, lat, lng, max_miles, threshold, limit)` — vector similarity + geo filtering
- `clean_expired_cache()` — removes expired entries (run daily/weekly)
- `get_cache_statistics()` — analytics (hit rates, counts, etc.)

### Backend Integration

See `backend/src/services/supabaseService.js` for usage.

## Manual Cleanup

Call from backend (Python):

```python
from supabase import create_client

supabase = create_client(url, service_role_key)
supabase.rpc('clean_expired_cache').execute()
```

Schedule this daily/weekly as needed.
