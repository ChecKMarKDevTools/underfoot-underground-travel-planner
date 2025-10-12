# AI Agent Instructions: Supabase Vector Cache

## Architecture

3-table system with event-based expiration and vector similarity search:

- **`semantic_cache`** - Stores intent embeddings (vector(1536)) + location + `result_ids` array
- **`api_results_cache`** - Stores actual API responses with `event_date` expiration
- **`location_cache`** - Geocoding cache (standard TTL)

**Key:** `semantic_cache` references `api_results_cache` via UUID arrays. Never duplicate JSONB.

## Critical Constants

- **Similarity threshold:** 0.77 (77%)
- **Distance cutoff:** 80 miles (hard limit)
- **Scoring weights:** 70% intent + 30% proximity (exponential decay)
- **Result limit:** 6 max
- **Default event TTL:** 4 weeks (`now() + interval '4 weeks'`)

## Expiration Model

**Event-based, not TTL:** Results expire when `event_date < now()`.

- Venues with specific events → use actual event date
- Always-open venues → default 4 weeks from creation
- Run `clean_expired_cache()` daily

## Function Signatures

```sql
-- Vector search with geographic filtering
find_similar_intents_nearby(
  input_intent_embedding vector(1536),
  user_lat decimal,
  user_lng decimal,
  max_distance_miles int DEFAULT 80,
  intent_similarity_threshold float DEFAULT 0.77,
  result_limit int DEFAULT 6
) RETURNS TABLE(...)

-- Cleanup expired entries
clean_expired_cache() RETURNS jsonb

-- Statistics
get_cache_statistics() RETURNS jsonb

-- Update access tracking
update_cache_access(cache_id uuid) RETURNS void
```

## Schema Constraints

- `semantic_cache.result_ids` is `uuid[]` not `jsonb`
- All functions use `SECURITY DEFINER SET search_path = public, pg_temp`
- Extensions (`vector`, `cube`, `earthdistance`) must be in `public` schema
- RLS enabled on all tables (currently public for pre-beta)

## Python Service Layer

Located in `backend/src/services/vectorService.py`:

- `find_similar_intent_nearby()` - Calls Supabase function
- `store_semantic_cache()` - Inserts semantic cache entry
- `store_api_results()` - Inserts into api\_results\_cache
- `fetch_results_by_ids()` - Retrieves full JSONB from result\_ids

## Migration Files

Located in `supabase/migrations/`:

1. `20251008181641_enable_extensions.sql` - Enable pgvector
2. `20251008181642_create_schema.sql` - Create 3 tables
3. `20251008181643_create_functions.sql` - Create 4 functions
4. `20251008181644_rls_policies.sql` - Enable RLS

**Order matters.** Never reorder or rename.

## Security

- `SUPABASE_SERVICE_ROLE_KEY` required for server-side operations
- `SUPABASE_ANON_KEY` safe for client (with RLS)
- Never expose service role key to frontend
- All secrets in `backend/.env` only

## Common Pitfalls

1. **Don't** store full JSONB in `semantic_cache` - use `result_ids` references
2. **Don't** use arbitrary TTL - use event-based expiration
3. **Don't** forget distance is in miles, not kilometers
4. **Don't** put extensions in `extensions` schema - breaks type references
5. **Don't** skip `SET search_path` on functions - security risk

## Reference Docs

- [README.md](./README.md) - Overview, tables, functions
- [IMPLEMENTATION.md](./IMPLEMENTATION.md) - Code examples, scoring algorithm
- [ELI5.md](./ELI5.md) - Similarity threshold explanation
- [docs/ENVIRONMENT\_VARIABLES.md](../ENVIRONMENT_VARIABLES.md) - Supabase env vars

<!-- Generated with GitHub Copilot as directed by Ashley Childress -->
