-- Vector Search: Intent-based semantic caching
-- 77% similarity threshold, 80-mile hard cutoff, exponential distance decay

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

-- Semantic cache table (intent embeddings + geographic filtering)
CREATE TABLE IF NOT EXISTS semantic_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Intent (vectorized)
  intent text NOT NULL,
  intent_embedding vector(1536) NOT NULL,
  
  -- Location (geocoded, NOT vectorized)
  location text NOT NULL,
  city text,
  county text,
  region text,
  country text,
  postal_code text,
  latitude decimal(10, 8),
  longitude decimal(11, 8),
  
  -- Cached API response
  cached_results jsonb NOT NULL,
  
  -- Metadata
  access_count integer DEFAULT 1,
  last_accessed timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL
);

-- Indexes
CREATE INDEX idx_semantic_intent_embedding 
ON semantic_cache USING ivfflat (intent_embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX idx_semantic_location ON semantic_cache(city, region, country);
CREATE INDEX idx_semantic_coords ON semantic_cache(latitude, longitude);
CREATE INDEX idx_semantic_expires ON semantic_cache(expires_at);
CREATE INDEX idx_semantic_access_count ON semantic_cache(access_count DESC);

-- Find similar intents nearby
-- Returns up to 6 results with 77%+ similarity within 80 miles
CREATE OR REPLACE FUNCTION find_similar_intents_nearby(
  input_intent_embedding vector(1536),
  user_lat decimal,
  user_lng decimal,
  max_distance_miles integer DEFAULT 80,
  intent_similarity_threshold float DEFAULT 0.77,
  result_limit integer DEFAULT 6
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
    -- Intent similarity (cosine similarity 0-1)
    (1 - (sc.intent_embedding <=> input_intent_embedding)) as intent_similarity,
    -- Distance in miles
    (earth_distance(
      ll_to_earth(sc.latitude, sc.longitude),
      ll_to_earth(user_lat, user_lng)
    ) * 0.000621371) as distance_miles,
    -- Relevance: 70% intent + 30% proximity (exponential decay)
    -- Exponential decay means far places lose points FAST
    (
      (1 - (sc.intent_embedding <=> input_intent_embedding)) * 0.7 +
      -- This SUBTRACTS as distance increases: 1 - (d/80)^2
      -- 0mi=1.0, 40mi=0.75, 60mi=0.44, 80mi=0.0
      (1 - POWER((earth_distance(
        ll_to_earth(sc.latitude, sc.longitude),
        ll_to_earth(user_lat, user_lng)
      ) * 0.000621371) / max_distance_miles, 2)) * 0.3
    ) as relevance_score,
    sc.access_count
  FROM semantic_cache sc
  WHERE 
    -- Must be similar enough
    (1 - (sc.intent_embedding <=> input_intent_embedding)) >= intent_similarity_threshold
    -- HARD CUTOFF: Beyond max_distance_miles = EXCLUDED
    AND earth_distance(
      ll_to_earth(sc.latitude, sc.longitude),
      ll_to_earth(user_lat, user_lng)
    ) <= (max_distance_miles * 1609.34)
    AND sc.expires_at > now()
  ORDER BY relevance_score DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- Update access tracking
CREATE OR REPLACE FUNCTION update_cache_access(cache_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE semantic_cache 
  SET 
    access_count = access_count + 1,
    last_accessed = now()
  WHERE id = cache_id;
END;
$$ LANGUAGE plpgsql;

-- Enhanced cache cleanup
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
  
  DELETE FROM semantic_cache WHERE expires_at < now();
  GET DIAGNOSTICS semantic_deleted = ROW_COUNT;
  
  SELECT json_build_object(
    'search_results_deleted', search_deleted,
    'location_cache_deleted', location_deleted,
    'semantic_cache_deleted', semantic_deleted,
    'cleanup_time', now()
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Cache statistics
CREATE OR REPLACE FUNCTION get_cache_statistics()
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'search_results_count', (SELECT COUNT(*) FROM search_results),
    'location_cache_count', (SELECT COUNT(*) FROM location_cache),
    'semantic_cache_count', (SELECT COUNT(*) FROM semantic_cache),
    'total_semantic_accesses', (SELECT COALESCE(SUM(access_count), 0) FROM semantic_cache),
    'avg_similarity_threshold', 0.77,
    'max_distance_miles', 80,
    'statistics_generated_at', now()
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE semantic_cache IS 'Intent-based cache with 77% similarity, 80-mile hard cutoff, exponential distance decay';
COMMENT ON FUNCTION find_similar_intents_nearby IS 'Returns up to 6 cached results with similar intent within 80 miles. Scoring: 70% intent + 30% proximity (exponential decay). Far = heavily penalized.';
