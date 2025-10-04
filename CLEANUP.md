# Cleanup Instructions

## Files to Delete

```bash
# From repo root
cd supabase/migrations
rm 004_enhanced_rls_security.sql
rm 005_vector_search_corrected.sql

cd ../..
rm VECTOR_SEARCH_README.md
rm VECTOR_SEARCH_CORRECTED.md
rm IMPLEMENTATION_SUMMARY.md
rm CLEANUP.md

# Commit
git add -A
git commit -m "chore: remove deprecated vector search files"
```

## What's Kept

✅ **Migrations:**
- `001_initial_schema.sql` - Base cache tables
- `002_rls_policies.sql` - Base RLS
- `003_vector_search.sql` - Vector search (NEW, CORRECT)

✅ **Python Services:**
- `backend/src/services/vector_cache_service.py` - Vector cache implementation

✅ **Documentation:**
- `docs/VECTOR_SIMILARITY_ELI5.md` - User-friendly explanation
- `docs/architecture/VECTOR_SEARCH.md` - Technical documentation

## Migration Details

The `003_vector_search.sql` migration includes:
- ✅ `semantic_intent_cache` table with proper schema
- ✅ Vector indexes (ivfflat with 1536 dimensions)
- ✅ `find_similar_intents_nearby()` RPC function with:
  - Exact param names: `input_intent_embedding`, `user_lat`, `user_lng`, `max_distance_miles`, `intent_similarity_threshold`
  - 77% similarity threshold
  - 80-mile hard cutoff
  - Exponential distance decay scoring
  - 70/30 intent/proximity weighting
- ✅ `update_cache_access()` function
- ✅ `clean_expired_cache()` enhanced for semantic cache
- ✅ `get_cache_statistics()` updated

All RPC functions are public (SECURITY INVOKER) and work with the anon key as per existing RLS policies.
