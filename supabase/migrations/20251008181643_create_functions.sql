-- ============================================================================
-- FUNCTIONS: Core database functions for caching operations
-- ============================================================================
-- Production deployment: 2025-10-08

-- ============================================================================
-- Function: find_similar_intents_nearby
-- Vector similarity search with geographic filtering
-- ============================================================================
-- Returns cached results with similar intent within geographic radius
-- Scoring: 70% intent similarity + 30% proximity (exponential decay)
-- 77% similarity threshold, 80-mile hard cutoff
-- ============================================================================
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
  result_ids uuid[],
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
    sc.result_ids,
    -- Intent similarity: 1.0 = perfect match, 0.0 = opposite
    (1 - (sc.intent_embedding <=> input_intent_embedding))::float as intent_similarity,
    -- Distance in miles using earthdistance
    (earth_distance(
      ll_to_earth(sc.latitude, sc.longitude),
      ll_to_earth(user_lat, user_lng)
    ) * 0.000621371)::float as distance_miles,
    -- Relevance score with exponential distance decay
    -- 70% intent + 30% proximity
    -- Proximity decays exponentially: 0mi=1.0, 40mi=0.75, 60mi=0.44, 80mi=0.0
    (
      (1 - (sc.intent_embedding <=> input_intent_embedding)) * 0.7 +
      (1 - POWER(
        (earth_distance(
          ll_to_earth(sc.latitude, sc.longitude),
          ll_to_earth(user_lat, user_lng)
        ) * 0.000621371) / max_distance_miles,
        2
      )) * 0.3
    )::float as relevance_score,
    sc.access_count
  FROM semantic_cache sc
  WHERE
    -- Must meet similarity threshold
    (1 - (sc.intent_embedding <=> input_intent_embedding)) >= intent_similarity_threshold
    -- HARD CUTOFF: Beyond max_distance_miles = EXCLUDED
    AND earth_distance(
      ll_to_earth(sc.latitude, sc.longitude),
      ll_to_earth(user_lat, user_lng)
    ) <= (max_distance_miles * 1609.34) -- Convert miles to meters
    -- Must not be expired
    AND sc.expires_at > now()
    -- Must have valid coordinates
    AND sc.latitude IS NOT NULL
    AND sc.longitude IS NOT NULL
  ORDER BY relevance_score DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

COMMENT ON FUNCTION find_similar_intents_nearby IS 'Vector similarity search with geographic filtering. Returns up to 6 results with 77%+ similarity within 80 miles. Exponential distance decay heavily penalizes far locations.';

-- ============================================================================
-- Function: update_cache_access
-- Track cache hit analytics
-- ============================================================================
CREATE OR REPLACE FUNCTION update_cache_access(cache_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE semantic_cache
  SET
    access_count = access_count + 1,
    last_accessed = now()
  WHERE id = cache_id;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public, pg_temp;

COMMENT ON FUNCTION update_cache_access IS 'Increment access count and update last_accessed timestamp for cache analytics';

-- ============================================================================
-- Function: clean_expired_cache
-- Remove expired entries from all cache tables
-- ============================================================================
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS json AS $$
DECLARE
  location_deleted integer;
  semantic_deleted integer;
  api_deleted integer;
  result json;
BEGIN
  -- Clean expired location cache
  DELETE FROM location_cache WHERE expires_at <= now();
  GET DIAGNOSTICS location_deleted = ROW_COUNT;

  -- Clean semantic cache with no valid results
  DELETE FROM semantic_cache WHERE expires_at <= now();
  GET DIAGNOSTICS semantic_deleted = ROW_COUNT;

  -- Clean expired API results (events in the past)
  DELETE FROM api_results_cache WHERE event_date < now();
  GET DIAGNOSTICS api_deleted = ROW_COUNT;

  SELECT json_build_object(
    'location_cache_deleted', location_deleted,
    'semantic_cache_deleted', semantic_deleted,
    'api_results_deleted', api_deleted,
    'cleanup_time', now()
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public, pg_temp;

COMMENT ON FUNCTION clean_expired_cache IS 'Remove expired cache entries from all tables. Returns deletion counts as JSON.';

-- ============================================================================
-- Function: get_cache_statistics
-- Return comprehensive cache statistics
-- ============================================================================
CREATE OR REPLACE FUNCTION get_cache_statistics()
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'location_cache', json_build_object(
      'total_count', (SELECT COUNT(*) FROM location_cache),
      'active_count', (SELECT COUNT(*) FROM location_cache WHERE expires_at > now()),
      'avg_confidence', (SELECT ROUND(AVG(confidence)::numeric, 3) FROM location_cache WHERE expires_at > now())
    ),
    'semantic_cache', json_build_object(
      'total_count', (SELECT COUNT(*) FROM semantic_cache),
      'active_count', (SELECT COUNT(*) FROM semantic_cache WHERE expires_at > now()),
      'total_accesses', (SELECT COALESCE(SUM(access_count), 0) FROM semantic_cache),
      'avg_access_count', (SELECT ROUND(AVG(access_count)::numeric, 2) FROM semantic_cache WHERE expires_at > now())
    ),
    'api_results', json_build_object(
      'total_count', (SELECT COUNT(*) FROM api_results_cache),
      'active_count', (SELECT COUNT(*) FROM api_results_cache WHERE event_date >= now()),
      'expired_count', (SELECT COUNT(*) FROM api_results_cache WHERE event_date < now()),
      'by_source', (
        SELECT json_object_agg(source, cnt)
        FROM (
          SELECT source, COUNT(*) as cnt
          FROM api_results_cache
          WHERE event_date >= now()
          GROUP BY source
        ) s
      )
    ),
    'config', json_build_object(
      'similarity_threshold', 0.77,
      'max_distance_miles', 80,
      'vector_dimensions', 1536,
      'embedding_model', 'text-embedding-ada-002',
      'default_event_ttl_weeks', 4
    ),
    'generated_at', now()
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

COMMENT ON FUNCTION get_cache_statistics IS 'Return comprehensive cache statistics including counts, performance metrics, and configuration';
