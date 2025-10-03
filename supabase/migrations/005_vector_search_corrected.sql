-- CORRECTED Vector Search Implementation
-- Fixes: Single intent/location fields, proper geocoding, American units, 80/20 weighting

-- Drop incorrect semantic_cache table if exists
DROP TABLE IF EXISTS semantic_cache CASCADE;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

-- Create CORRECTED semantic intent cache
CREATE TABLE IF NOT EXISTS semantic_intent_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- INTENT (what they're looking for) - this gets vectorized
  intent text NOT NULL,
  intent_embedding vector(1536) NOT NULL,
  
  -- LOCATION (where they're looking) - geocoded address
  location text NOT NULL,              -- "Portland, Multnomah County, Oregon, United States"
  city text,                           -- "Portland"
  county text,                         -- "Multnomah County" 
  region text,                         -- "Oregon" (state/province/territory)
  country text,                        -- "United States"
  postal_code text,                    -- ZIP code for US, postcode for others
  
  -- COORDINATES for distance calculations
  latitude decimal(10, 8),             -- 45.51520000
  longitude decimal(11, 8),            -- -122.67840000
  
  -- CACHED RESULTS - the actual search response we return
  -- Contains: places[], response (Stonewalker text), user_intent, user_location
  cached_results jsonb NOT NULL,
  
  -- CACHE METADATA
  access_count integer DEFAULT 1,
  last_accessed timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL
);

-- Vector similarity index for intent matching
CREATE INDEX idx_semantic_intent_embedding 
ON semantic_intent_cache USING ivfflat (intent_embedding vector_cosine_ops) WITH (lists = 100);

-- Geographic indexes
CREATE INDEX idx_semantic_location ON semantic_intent_cache(city, region, country);
CREATE INDEX idx_semantic_coords ON semantic_intent_cache(latitude, longitude);
CREATE INDEX idx_semantic_expires ON semantic_intent_cache(expires_at);
CREATE INDEX idx_semantic_access_count ON semantic_intent_cache(access_count DESC);

-- Function: Find similar intents near a location
-- Uses 80% intent similarity, 20% geographic proximity
CREATE OR REPLACE FUNCTION find_similar_intents_nearby(
  input_intent_embedding vector(1536),
  user_lat decimal,
  user_lng decimal,
  max_distance_miles integer DEFAULT 50,
  intent_similarity_threshold float DEFAULT 0.85,
  result_limit integer DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  intent text,
  location text,
  cached_results jsonb,
  intent_similarity float,
  distance_miles float,
  relevance_score float,
  access_count integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sc.id,
    sc.intent,
    sc.location,
    sc.cached_results,
    -- Intent similarity (cosine similarity, 0-1)
    (1 - (sc.intent_embedding <=> input_intent_embedding)) as intent_similarity,
    -- Distance in miles using earthdistance extension
    (earth_distance(
      ll_to_earth(sc.latitude, sc.longitude),
      ll_to_earth(user_lat, user_lng)
    ) * 0.000621371) as distance_miles,  -- meters to miles conversion
    -- Combined relevance: 80% intent, 20% proximity
    (
      (1 - (sc.intent_embedding <=> input_intent_embedding)) * 0.8 +
      (1 - LEAST((earth_distance(
        ll_to_earth(sc.latitude, sc.longitude),
        ll_to_earth(user_lat, user_lng)
      ) * 0.000621371) / max_distance_miles, 1)) * 0.2
    ) as relevance_score,
    sc.access_count
  FROM semantic_intent_cache sc
  WHERE 
    -- Intent must be similar enough
    (1 - (sc.intent_embedding <=> input_intent_embedding)) >= intent_similarity_threshold
    -- Must be within distance radius
    AND earth_distance(
      ll_to_earth(sc.latitude, sc.longitude),
      ll_to_earth(user_lat, user_lng)
    ) <= (max_distance_miles * 1609.34)  -- miles to meters
    -- Not expired
    AND sc.expires_at > now()
  ORDER BY relevance_score DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- Update access count when cache is used
CREATE OR REPLACE FUNCTION update_cache_access(cache_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE semantic_intent_cache 
  SET 
    access_count = access_count + 1,
    last_accessed = now()
  WHERE id = cache_id;
END;
$$ LANGUAGE plpgsql;

-- Enhanced cleanup function for new table
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS json AS $$
DECLARE
  search_deleted integer;
  location_deleted integer;
  semantic_deleted integer;
  result json;
BEGIN
  DELETE FROM search_results WHERE expires_at < now();
  GET DIAGNOSTICS search_deleted = ROW_COUNT;
  
  DELETE FROM location_cache WHERE expires_at < now();
  GET DIAGNOSTICS location_deleted = ROW_COUNT;
  
  DELETE FROM semantic_intent_cache WHERE expires_at < now();
  GET DIAGNOSTICS semantic_deleted = ROW_COUNT;
  
  SELECT json_build_object(
    'search_results_deleted', search_deleted,
    'location_cache_deleted', location_deleted,
    'semantic_intent_cache_deleted', semantic_deleted,
    'cleanup_time', now()
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Get comprehensive cache statistics
CREATE OR REPLACE FUNCTION get_cache_statistics()
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'search_results_count', (SELECT COUNT(*) FROM search_results),
    'location_cache_count', (SELECT COUNT(*) FROM location_cache),
    'semantic_intent_cache_count', (SELECT COUNT(*) FROM semantic_intent_cache),
    'underground_keywords_count', (SELECT COUNT(*) FROM underground_keywords),
    'total_semantic_accesses', (SELECT COALESCE(SUM(access_count), 0) FROM semantic_intent_cache),
    'avg_intent_similarity_threshold', 0.85,
    'statistics_generated_at', now()
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE semantic_intent_cache IS 'Intent-based semantic cache with geographic filtering. Stores search results keyed by intent embedding + location coordinates.';
COMMENT ON COLUMN semantic_intent_cache.intent IS 'User intent extracted from query (e.g., "underground bars", "hidden gems")';
COMMENT ON COLUMN semantic_intent_cache.intent_embedding IS 'OpenAI text-embedding-ada-002 vector for semantic similarity matching';
COMMENT ON COLUMN semantic_intent_cache.cached_results IS 'Complete search response including places array and Stonewalker message';
COMMENT ON COLUMN semantic_intent_cache.latitude IS 'Decimal degrees latitude for geographic distance calculation';
COMMENT ON COLUMN semantic_intent_cache.longitude IS 'Decimal degrees longitude for geographic distance calculation';
COMMENT ON FUNCTION find_similar_intents_nearby IS 'Finds cached results with similar intent within geographic radius. Uses 80% intent similarity + 20% proximity weighting. Distance in miles.';
