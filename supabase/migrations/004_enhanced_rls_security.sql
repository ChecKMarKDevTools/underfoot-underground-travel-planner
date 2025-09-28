-- Enhanced RLS policies for vector search tables
-- Implements more secure access patterns while maintaining functionality

-- Enable RLS on new vector tables
ALTER TABLE underground_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE semantic_cache ENABLE ROW LEVEL SECURITY;

-- Underground Keywords Policies
-- Read access for all users (keywords are generally public)
CREATE POLICY "Allow public read access on underground_keywords" 
  ON underground_keywords FOR SELECT 
  USING (true);

-- Restrict write access to service role only (keywords should be managed)
CREATE POLICY "Allow service role write access on underground_keywords" 
  ON underground_keywords FOR INSERT 
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Allow service role update access on underground_keywords" 
  ON underground_keywords FOR UPDATE 
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role delete access on underground_keywords" 
  ON underground_keywords FOR DELETE 
  TO service_role
  USING (true);

-- Semantic Cache Policies
-- Allow public read access for cache lookups
CREATE POLICY "Allow public read access on semantic_cache" 
  ON semantic_cache FOR SELECT 
  USING (true);

-- Allow public insert for caching new results
CREATE POLICY "Allow public write access on semantic_cache" 
  ON semantic_cache FOR INSERT 
  WITH CHECK (true);

-- Allow updates for access count tracking
CREATE POLICY "Allow public update access on semantic_cache" 
  ON semantic_cache FOR UPDATE 
  USING (true) WITH CHECK (true);

-- Restrict delete to service role for cleanup operations
CREATE POLICY "Allow service role delete access on semantic_cache" 
  ON semantic_cache FOR DELETE 
  TO service_role
  USING (true);

-- Grant permissions for new tables
GRANT SELECT ON underground_keywords TO anon, authenticated;
GRANT ALL ON semantic_cache TO anon, authenticated;
GRANT ALL ON underground_keywords TO service_role;

-- Grant usage on sequences for UUID generation
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- Enhanced security function permissions
-- Only service_role can run cleanup functions
REVOKE EXECUTE ON FUNCTION clean_expired_cache() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION clean_expired_cache() TO service_role;

-- Public access to read-only analytics function
GRANT EXECUTE ON FUNCTION get_cache_statistics() TO anon, authenticated, service_role;

-- Public access to search functions (needed for cache lookups)
GRANT EXECUTE ON FUNCTION find_similar_cached_query(vector, vector, float, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION find_underground_keywords(vector, float, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_cache_access(uuid) TO anon, authenticated, service_role;

-- Create role for vector search operations if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vector_search_user') THEN
    CREATE ROLE vector_search_user;
  END IF;
END
$$;

-- Grant specific permissions to vector search role
GRANT SELECT, INSERT, UPDATE ON search_results TO vector_search_user;
GRANT SELECT, INSERT, UPDATE ON location_cache TO vector_search_user;
GRANT SELECT, INSERT, UPDATE ON semantic_cache TO vector_search_user;
GRANT SELECT ON underground_keywords TO vector_search_user;
GRANT EXECUTE ON FUNCTION find_similar_cached_query(vector, vector, float, integer) TO vector_search_user;
GRANT EXECUTE ON FUNCTION find_underground_keywords(vector, float, integer) TO vector_search_user;
GRANT EXECUTE ON FUNCTION update_cache_access(uuid) TO vector_search_user;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO vector_search_user;

-- Comments for security documentation
COMMENT ON POLICY "Allow service role write access on underground_keywords" ON underground_keywords IS 
'Keywords should only be managed by service role to maintain data quality';

COMMENT ON POLICY "Allow service role delete access on semantic_cache" ON semantic_cache IS 
'Cache cleanup should only be performed by service role during maintenance';

-- Create indexes for security and performance on new tables
CREATE INDEX IF NOT EXISTS idx_underground_keywords_created_at ON underground_keywords(created_at);
CREATE INDEX IF NOT EXISTS idx_semantic_cache_created_at ON semantic_cache(created_at);
CREATE INDEX IF NOT EXISTS idx_semantic_cache_last_accessed ON semantic_cache(last_accessed);