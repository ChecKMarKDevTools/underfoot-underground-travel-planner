# Files to Delete

Run these commands to clean up deprecated/incorrect files:

```bash
cd /Users/anchildress1/git_personal/underfoot-underground-travel-planner/.worktrees/vector-search-caching-0928134002

# Delete old incorrect migrations
git rm supabase/migrations/004_enhanced_rls_security.sql
git rm supabase/migrations/005_vector_search_corrected.sql

# Delete wrong root-level docs
git rm VECTOR_SEARCH_CORRECTED.md
git rm VECTOR_SEARCH_README.md  
git rm IMPLEMENTATION_SUMMARY.md

# Delete old JavaScript implementations (using Python now)
git rm backend/src/services/supabaseService.js
git rm backend/src/services/cacheManagerService.js
git rm backend/src/services/vectorService.py  # Wrong Python location

# Commit cleanup
git add -A
git commit -m "chore: remove deprecated vector search files"
```

## What to Keep

✅ **Keep these:**
- `supabase/migrations/001_initial_schema.sql` - Original cache tables
- `supabase/migrations/002_rls_policies.sql` - Original RLS
- `supabase/migrations/003_vector_search.sql` - NEW corrected implementation
- `backend/src/services/vector_cache_service.py` - Python implementation
- `docs/VECTOR_SIMILARITY_ELI5.md` - User docs
- `docs/architecture/VECTOR_SEARCH.md` - Technical docs

## Summary

The correct implementation is:
1. Database: `003_vector_search.sql`
2. Python service: `backend/src/services/vector_cache_service.py`  
3. Docs: `docs/` folder with proper structure

Everything else was from the flawed first attempt and should be deleted.
