-- Initial schema for Underfoot caching system
-- Creates tables for search results and location normalization cache

-- Search results cache table
CREATE TABLE IF NOT EXISTS search_results (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  query_hash text NOT NULL UNIQUE,
  location text NOT NULL,
  intent text NOT NULL,
  results_json jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL
);

-- Location normalization cache table  
CREATE TABLE IF NOT EXISTS location_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  raw_input text NOT NULL UNIQUE,
  normalized_location text NOT NULL,
  confidence float NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  raw_candidates jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_search_results_query_hash ON search_results(query_hash);
CREATE INDEX IF NOT EXISTS idx_search_results_expires ON search_results(expires_at);
CREATE INDEX IF NOT EXISTS idx_search_results_location ON search_results(location);
CREATE INDEX IF NOT EXISTS idx_location_cache_raw_input ON location_cache(raw_input);
CREATE INDEX IF NOT EXISTS idx_location_cache_expires ON location_cache(expires_at);

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM search_results WHERE expires_at < now();
  DELETE FROM location_cache WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE search_results IS 'Cache for search query results with TTL expiration';
COMMENT ON TABLE location_cache IS 'Cache for location normalization with confidence scores';
COMMENT ON FUNCTION clean_expired_cache IS 'Removes expired cache entries from both cache tables';