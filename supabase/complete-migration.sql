-- Complete migration bundle for Supabase SQL Editor
-- Copy and paste this entire file into the Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste → Run

-- =============================================================================
-- STEP 1: Drop existing policies (cleanup)
-- =============================================================================

DROP POLICY IF EXISTS "Allow public read access on search_results" ON search_results;
DROP POLICY IF EXISTS "Allow public write access on search_results" ON search_results;
DROP POLICY IF EXISTS "Allow public update access on search_results" ON search_results;
DROP POLICY IF EXISTS "Allow public delete access on search_results" ON search_results;
DROP POLICY IF EXISTS "Allow public read access on location_cache" ON location_cache;
DROP POLICY IF EXISTS "Allow public write access on location_cache" ON location_cache;
DROP POLICY IF EXISTS "Allow public update access on location_cache" ON location_cache;
DROP POLICY IF EXISTS "Allow public delete access on location_cache" ON location_cache;

-- =============================================================================
-- STEP 2: Update schema with constraints
-- =============================================================================

-- Add constraints if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'valid_expiration' 
    AND conrelid = 'search_results'::regclass
  ) THEN
    ALTER TABLE search_results 
    ADD CONSTRAINT valid_expiration CHECK (expires_at > created_at);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'reasonable_ttl' 
    AND conrelid = 'search_results'::regclass
  ) THEN
    ALTER TABLE search_results 
    ADD CONSTRAINT reasonable_ttl CHECK (expires_at < created_at + interval '7 days');
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'valid_expiration' 
    AND conrelid = 'location_cache'::regclass
  ) THEN
    ALTER TABLE location_cache 
    ADD CONSTRAINT valid_expiration CHECK (expires_at > created_at);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'reasonable_ttl' 
    AND conrelid = 'location_cache'::regclass
  ) THEN
    ALTER TABLE location_cache 
    ADD CONSTRAINT reasonable_ttl CHECK (expires_at < created_at + interval '30 days');
  END IF;
END $$;

-- =============================================================================
-- STEP 3: Secure RLS Policies
-- =============================================================================

-- Enable RLS
ALTER TABLE search_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_cache ENABLE ROW LEVEL SECURITY;

-- SEARCH RESULTS: Read policy
CREATE POLICY "Public read access for valid cache" 
  ON search_results FOR SELECT 
  USING (expires_at > now());

-- SEARCH RESULTS: Insert policy
CREATE POLICY "Public insert access for search results" 
  ON search_results FOR INSERT 
  WITH CHECK (
    expires_at > now() AND 
    expires_at < now() + interval '7 days' AND
    query_hash IS NOT NULL AND 
    location IS NOT NULL AND 
    intent IS NOT NULL AND
    results_json IS NOT NULL
  );

-- SEARCH RESULTS: Update policy
CREATE POLICY "Public update access for search results" 
  ON search_results FOR UPDATE 
  USING (true)
  WITH CHECK (
    expires_at > now() AND 
    expires_at < now() + interval '7 days'
  );

-- LOCATION CACHE: Read policy
CREATE POLICY "Public read access for location cache" 
  ON location_cache FOR SELECT 
  USING (expires_at > now());

-- LOCATION CACHE: Insert policy
CREATE POLICY "Public insert access for location cache" 
  ON location_cache FOR INSERT 
  WITH CHECK (
    expires_at > now() AND 
    expires_at < now() + interval '30 days' AND
    confidence >= 0 AND 
    confidence <= 1 AND
    raw_input IS NOT NULL AND 
    normalized_location IS NOT NULL
  );

-- LOCATION CACHE: Update policy
CREATE POLICY "Public update access for location cache" 
  ON location_cache FOR UPDATE 
  USING (true)
  WITH CHECK (
    expires_at > now() AND 
    expires_at < now() + interval '30 days' AND
    confidence >= 0 AND 
    confidence <= 1
  );

-- =============================================================================
-- STEP 4: Permissions
-- =============================================================================

GRANT SELECT, INSERT, UPDATE ON search_results TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON location_cache TO anon, authenticated;
GRANT DELETE ON search_results TO service_role;
GRANT DELETE ON location_cache TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- =============================================================================
-- STEP 5: Automatic Cleanup (Daily at 3 AM)
-- =============================================================================

-- Update cleanup function to check event dates, not cache expiration
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS void AS $$
BEGIN
  -- Delete search results where ALL events have passed (startDate < now)
  DELETE FROM search_results 
  WHERE NOT EXISTS (
    SELECT 1 
    FROM jsonb_array_elements(results_json) AS event
    WHERE (event->>'startDate')::timestamptz > now()
  )
  AND jsonb_array_length(results_json) > 0;
  
  -- Delete location cache based on expires_at
  DELETE FROM location_cache WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove existing job if it exists
SELECT cron.unschedule('cleanup-expired-cache') WHERE true;

-- Schedule cleanup daily at 3 AM
SELECT cron.schedule(
  'cleanup-expired-cache',
  '0 3 * * *',
  $$SELECT clean_expired_cache()$$
);

-- =============================================================================
-- STEP 6: Anti-Spam Protection
-- =============================================================================

-- Create bloat prevention functions
CREATE OR REPLACE FUNCTION prevent_cache_bloat()
RETURNS TRIGGER AS $$
DECLARE
  row_count integer;
  max_rows integer := 10000;
BEGIN
  SELECT COUNT(*) INTO row_count FROM search_results;
  
  IF row_count >= max_rows THEN
    DELETE FROM search_results 
    WHERE id IN (
      SELECT id FROM search_results 
      ORDER BY created_at ASC 
      LIMIT 1000
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION prevent_location_cache_bloat()
RETURNS TRIGGER AS $$
DECLARE
  row_count integer;
  max_rows integer := 5000;
BEGIN
  SELECT COUNT(*) INTO row_count FROM location_cache;
  
  IF row_count >= max_rows THEN
    DELETE FROM location_cache 
    WHERE id IN (
      SELECT id FROM location_cache 
      ORDER BY created_at ASC 
      LIMIT 500
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS enforce_search_results_limit ON search_results;
DROP TRIGGER IF EXISTS enforce_location_cache_limit ON location_cache;

-- Create triggers
CREATE TRIGGER enforce_search_results_limit
  BEFORE INSERT ON search_results
  FOR EACH ROW
  EXECUTE FUNCTION prevent_cache_bloat();

CREATE TRIGGER enforce_location_cache_limit
  BEFORE INSERT ON location_cache
  FOR EACH ROW
  EXECUTE FUNCTION prevent_location_cache_bloat();

-- Add JSON size constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'reasonable_json_size'
    AND conrelid = 'search_results'::regclass
  ) THEN
    ALTER TABLE search_results
      ADD CONSTRAINT reasonable_json_size 
      CHECK (octet_length(results_json::text) < 1048576);
  END IF;
END $$;

-- =============================================================================
-- STEP 7: Monitoring View
-- =============================================================================

CREATE OR REPLACE VIEW cache_health AS
SELECT 
  'search_results' as table_name,
  COUNT(*) as total_rows,
  COUNT(*) FILTER (WHERE expires_at > now()) as valid_rows,
  COUNT(*) FILTER (WHERE expires_at <= now()) as expired_rows,
  ROUND(AVG(octet_length(results_json::text))::numeric, 2) as avg_json_size_bytes,
  MIN(created_at) as oldest_entry,
  MAX(created_at) as newest_entry
FROM search_results
UNION ALL
SELECT 
  'location_cache' as table_name,
  COUNT(*) as total_rows,
  COUNT(*) FILTER (WHERE expires_at > now()) as valid_rows,
  COUNT(*) FILTER (WHERE expires_at <= now()) as expired_rows,
  NULL as avg_json_size_bytes,
  MIN(created_at) as oldest_entry,
  MAX(created_at) as newest_entry
FROM location_cache;

GRANT SELECT ON cache_health TO anon, authenticated, service_role;

-- =============================================================================
-- DONE! Run the test-security.sh script to verify
-- =============================================================================

SELECT 'Migration complete! ✅' as status;
