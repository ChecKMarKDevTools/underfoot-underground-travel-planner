---
applyTo: supabase/**/*
---

# Supabase Instructions

Security and cache best practices for Supabase integration.

## Security Principles

### Row Level Security (RLS)
- **NEVER use `USING (true)` in production** - it allows unrestricted access
- **Cache tables should be write-restricted** - prevent cache poisoning and spam
- **Read access can be public** - caches are meant to be read
- **Delete operations must be admin-only** - use service role key, never expose to clients

### Time-To-Live (TTL) Management
- **Search results cache**: 30 minutes default (queries change frequently)
- **Location cache**: 24 hours default (locations are stable)
- **Never exceed 7 days** - stale data is worse than no data
- **Automatic cleanup required** - use pg_cron to purge expired entries

### Rate Limiting
- **Prevent cache spam** - limit inserts per IP/timeframe
- **Use PostgreSQL policies** - enforce at database level, not just application
- **Monitor abuse patterns** - track failed RLS policy blocks

### Storage Limits
- **No unlimited growth** - set row count limits per table
- **JSON payload limits** - cap results_json size to prevent bloat
- **Index efficiency** - only index fields actually used in queries

## Agentic Search Principles

### Cache Key Design
- **Normalize inputs** - lowercase, trim, consistent formatting
- **Include location in hash** - same query, different location = different results
- **Keep hashes short** - 32 chars sufficient for collision resistance
- **Deterministic generation** - same input = same hash every time

### Cache Hit Optimization
- **Check expiration before query** - use `gt('expires_at', now())`
- **Single query lookups** - use `.single()` with proper error handling
- **Fail gracefully** - cache miss should never break search
- **Log cache hit rates** - monitor effectiveness

### Write Strategy
- **Upsert on conflict** - overwrite stale entries with same hash
- **Batch writes when possible** - reduce transaction overhead
- **Never block on cache writes** - async fire-and-forget
- **Validate before caching** - garbage in = garbage cached

## Edge Function Guidelines

### Authentication
- **Use service role key** - edge functions need elevated privileges
- **Never expose admin key to client** - keep in Supabase secrets
- **Validate request origin** - check headers/CORS appropriately

### Error Handling
- **Always return proper HTTP status** - 200/400/500 with meaningful messages
- **Log errors to console** - Supabase captures these for debugging
- **Never expose internal errors to client** - sanitize error messages

### Table References
- **Match migration schema** - function must reference actual table names
- **Test function locally** - use `supabase functions serve` before deploy
- **Version your functions** - breaking changes need new function names

## Required Environment Variables

When deploying (local or cloud):
- `SUPABASE_URL` - Database endpoint
- `SUPABASE_ANON_KEY` - Public access (restricted by RLS)
- `SUPABASE_SERVICE_ROLE_KEY` - Admin access (backend only, never expose)

## Testing Checklist

Before deploying changes:
- [ ] RLS policies block unauthorized deletes
- [ ] Cache writes succeed with anon key
- [ ] Expired entries are auto-purged
- [ ] Edge functions reference correct tables
- [ ] Rate limits prevent spam
- [ ] TTLs are appropriate for data type

## Verification Commands

```bash
# Local development
supabase start
supabase status  # Get your local keys
supabase db reset  # Apply migrations fresh

# Test RLS policies
psql $DATABASE_URL -c "SELECT * FROM search_results;"  # Should work
psql $DATABASE_URL -c "DELETE FROM search_results;"    # Should fail with anon key

# Check cleanup job
psql $DATABASE_URL -c "SELECT * FROM cron.job;"
```
