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
  expires_at timestamptz NOT NULL,
  CONSTRAINT valid_expiration CHECK (expires_at > created_at),
  CONSTRAINT reasonable_ttl CHECK (expires_at < created_at + interval '7 days')
);

-- Location normalization cache table  
CREATE TABLE IF NOT EXISTS location_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  raw_input text NOT NULL UNIQUE,
  normalized_location text NOT NULL,
  confidence float NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  raw_candidates jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  CONSTRAINT valid_expiration CHECK (expires_at > created_at),
  CONSTRAINT reasonable_ttl CHECK (expires_at < created_at + interval '30 days')
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable pg_cron extension for automatic cleanup
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule cleanup to run every hour (requires pg_cron)
-- This removes the need for manual cleanup calls
SELECT cron.schedule(
  'cleanup-expired-cache',
  '0 * * * *',  -- Every hour at minute 0
  $$SELECT clean_expired_cache()$$
);

-- Comments for documentation
COMMENT ON TABLE search_results IS 'Cache for search query results with TTL expiration';
COMMENT ON TABLE location_cache IS 'Cache for location normalization with confidence scores';
COMMENT ON FUNCTION clean_expired_cache IS 'Removes expired cache entries from both cache tables';
COMMENT ON CONSTRAINT valid_expiration ON search_results IS 'Prevents setting expiration before creation time';
COMMENT ON CONSTRAINT reasonable_ttl ON search_results IS 'Prevents cache entries lasting longer than 7 days';
COMMENT ON CONSTRAINT reasonable_ttl ON location_cache IS 'Prevents location cache lasting longer than 30 days';
