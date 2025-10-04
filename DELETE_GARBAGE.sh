#!/bin/bash
# DELETE ALL DEPRECATED FILES - RUN THIS NOW

cd "$(dirname "$0")"

echo "🗑️  Deleting deprecated files..."

# Delete deprecated migrations
rm -f supabase/migrations/004_enhanced_rls_security.sql
rm -f supabase/migrations/005_vector_search_corrected.sql

# Delete seed bullshit
rm -f supabase/seed.sql

# Delete root-level garbage docs
rm -f VECTOR_SEARCH_README.md
rm -f VECTOR_SEARCH_CORRECTED.md
rm -f IMPLEMENTATION_SUMMARY.md
rm -f CLEANUP.md

# Delete this script itself when done
rm -f DELETE_GARBAGE.sh

echo "✅ Cleanup complete"
echo ""
echo "Remaining migrations:"
ls -la supabase/migrations/

git status
