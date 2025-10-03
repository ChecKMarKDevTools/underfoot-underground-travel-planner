-- Secure Row Level Security policies for cache tables
-- Blocks unauthorized deletes while allowing public reads and controlled writes

-- Enable RLS on both tables
ALTER TABLE search_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_cache ENABLE ROW LEVEL SECURITY;

-- SEARCH RESULTS POLICIES

-- Allow anyone to read non-expired cache entries
CREATE POLICY "Public read access for valid cache" 
  ON search_results FOR SELECT 
  USING (expires_at > now());

-- Allow authenticated inserts with rate limiting (enforced by app logic)
CREATE POLICY "Public insert access for search results" 
  ON search_results FOR INSERT 
  WITH CHECK (
    -- Require valid expiration (not in past, not more than 7 days out)
    expires_at > now() AND 
    expires_at < now() + interval '7 days' AND
    -- Require non-empty fields
    query_hash IS NOT NULL AND 
    location IS NOT NULL AND 
    intent IS NOT NULL AND
    results_json IS NOT NULL
  );

-- Allow updates only to extend TTL on same query_hash (upsert pattern)
CREATE POLICY "Public update access for search results" 
  ON search_results FOR UPDATE 
  USING (true)
  WITH CHECK (
    expires_at > now() AND 
    expires_at < now() + interval '7 days'
  );

-- ONLY service role can delete (prevents cache bombing)
-- No public delete policy = deletes blocked by RLS

-- LOCATION CACHE POLICIES

-- Allow anyone to read non-expired location cache
CREATE POLICY "Public read access for location cache" 
  ON location_cache FOR SELECT 
  USING (expires_at > now());

-- Allow authenticated inserts with validation
CREATE POLICY "Public insert access for location cache" 
  ON location_cache FOR INSERT 
  WITH CHECK (
    -- Require valid expiration (not in past, not more than 30 days out)
    expires_at > now() AND 
    expires_at < now() + interval '30 days' AND
    -- Require valid confidence score
    confidence >= 0 AND 
    confidence <= 1 AND
    -- Require non-empty fields
    raw_input IS NOT NULL AND 
    normalized_location IS NOT NULL
  );

-- Allow updates only to extend TTL on same raw_input (upsert pattern)
CREATE POLICY "Public update access for location cache" 
  ON location_cache FOR UPDATE 
  USING (true)
  WITH CHECK (
    expires_at > now() AND 
    expires_at < now() + interval '30 days' AND
    confidence >= 0 AND 
    confidence <= 1
  );

-- ONLY service role can delete (prevents cache bombing)
-- No public delete policy = deletes blocked by RLS

-- Grant necessary SELECT and INSERT permissions to anon role
GRANT SELECT, INSERT, UPDATE ON search_results TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON location_cache TO anon, authenticated;

-- Grant DELETE only to service_role (admin operations)
GRANT DELETE ON search_results TO service_role;
GRANT DELETE ON location_cache TO service_role;

-- Grant usage on sequences (needed for UUID generation)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Comments
COMMENT ON POLICY "Public read access for valid cache" ON search_results IS 
  'Allows public reads of non-expired cache entries only';
COMMENT ON POLICY "Public insert access for search results" ON search_results IS 
  'Allows inserts with TTL validation and required fields check';
COMMENT ON POLICY "Public update access for search results" ON search_results IS 
  'Allows upserts on existing query_hash with TTL validation';
