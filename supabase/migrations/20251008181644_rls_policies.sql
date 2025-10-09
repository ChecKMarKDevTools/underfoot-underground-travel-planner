-- ============================================================================
-- RLS POLICIES: Row Level Security for production
-- ============================================================================
-- Production deployment: 2025-10-08
-- Public access for pre-beta (no auth required)
-- ⚠️ PRODUCTION NOTE: Restrict these policies when adding authentication

-- ============================================================================
-- Enable RLS on all tables
-- ============================================================================
ALTER TABLE api_results_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE semantic_cache ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Table: api_results_cache
-- Public access policies (pre-beta prototype)
-- ============================================================================
CREATE POLICY "api_results_public_select"
  ON api_results_cache FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "api_results_public_insert"
  ON api_results_cache FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "api_results_public_update"
  ON api_results_cache FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "api_results_public_delete"
  ON api_results_cache FOR DELETE
  TO anon, authenticated
  USING (true);

-- ============================================================================
-- Table: location_cache
-- Public access policies (pre-beta prototype)
-- ============================================================================
CREATE POLICY "location_cache_public_select"
  ON location_cache FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "location_cache_public_insert"
  ON location_cache FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "location_cache_public_update"
  ON location_cache FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "location_cache_public_delete"
  ON location_cache FOR DELETE
  TO anon, authenticated
  USING (true);

-- ============================================================================
-- Table: semantic_cache
-- Public access policies (pre-beta prototype)
-- ============================================================================
CREATE POLICY "semantic_cache_public_select"
  ON semantic_cache FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "semantic_cache_public_insert"
  ON semantic_cache FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "semantic_cache_public_update"
  ON semantic_cache FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "semantic_cache_public_delete"
  ON semantic_cache FOR DELETE
  TO anon, authenticated
  USING (true);

-- ============================================================================
-- Grant necessary table permissions
-- ============================================================================
GRANT ALL ON api_results_cache TO anon, authenticated;
GRANT ALL ON location_cache TO anon, authenticated;
GRANT ALL ON semantic_cache TO anon, authenticated;

-- ============================================================================
-- Grant function execution permissions
-- ============================================================================
GRANT EXECUTE ON FUNCTION find_similar_intents_nearby TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_cache_access TO anon, authenticated;
GRANT EXECUTE ON FUNCTION clean_expired_cache TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_cache_statistics TO anon, authenticated;

-- ============================================================================
-- Grant sequence permissions (for UUID generation)
-- ============================================================================
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- ============================================================================
-- Verification: Ensure RLS is enabled
-- ============================================================================
DO $$
DECLARE
  rls_enabled boolean;
BEGIN
  -- Check api_results_cache
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class
  WHERE relname = 'api_results_cache';

  IF NOT rls_enabled THEN
    RAISE EXCEPTION 'RLS not enabled on api_results_cache';
  END IF;

  -- Check location_cache
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class
  WHERE relname = 'location_cache';

  IF NOT rls_enabled THEN
    RAISE EXCEPTION 'RLS not enabled on location_cache';
  END IF;

  -- Check semantic_cache
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class
  WHERE relname = 'semantic_cache';

  IF NOT rls_enabled THEN
    RAISE EXCEPTION 'RLS not enabled on semantic_cache';
  END IF;

  RAISE NOTICE 'RLS enabled and policies created successfully on all tables';
END $$;

-- ============================================================================
-- Policy documentation
-- ============================================================================
COMMENT ON POLICY "api_results_public_select" ON api_results_cache IS 'Pre-beta: Allow unrestricted SELECT. TODO: Restrict in production.';
COMMENT ON POLICY "location_cache_public_select" ON location_cache IS 'Pre-beta: Allow unrestricted SELECT. TODO: Restrict in production.';
COMMENT ON POLICY "semantic_cache_public_select" ON semantic_cache IS 'Pre-beta: Allow unrestricted SELECT. TODO: Restrict in production.';
