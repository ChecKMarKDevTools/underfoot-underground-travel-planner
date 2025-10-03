-- Enable pgvector extension for vector search capabilities
-- Adds semantic similarity matching to the caching system

-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add vector columns to existing search_results table
ALTER TABLE search_results 
ADD COLUMN IF NOT EXISTS query_embedding vector(1536),
ADD COLUMN IF NOT EXISTS location_embedding vector(1536);

-- Add vector columns to existing location_cache table  
ALTER TABLE location_cache
ADD COLUMN IF NOT EXISTS input_embedding vector(1536);

-- Create dedicated table for underground travel keywords and their embeddings
CREATE TABLE IF NOT EXISTS underground_keywords (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword text NOT NULL UNIQUE,
  category text NOT NULL, -- 'transport', 'location', 'activity', 'poi' etc
  embedding vector(1536) NOT NULL,
  weight float DEFAULT 1.0, -- relevance weight for scoring
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create table for semantic query cache with similarity matching
CREATE TABLE IF NOT EXISTS semantic_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  original_query text NOT NULL,
  normalized_query text NOT NULL, 
  query_embedding vector(1536) NOT NULL,
  location text NOT NULL,
  location_embedding vector(1536) NOT NULL,
  cached_results jsonb NOT NULL,
  similarity_threshold float DEFAULT 0.85, -- minimum similarity for cache hits
  access_count integer DEFAULT 1,
  last_accessed timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL
);

-- Vector similarity indexes for fast cosine similarity search
CREATE INDEX IF NOT EXISTS idx_search_results_query_embedding 
ON search_results USING ivfflat (query_embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_search_results_location_embedding 
ON search_results USING ivfflat (location_embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_location_cache_input_embedding 
ON location_cache USING ivfflat (input_embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_underground_keywords_embedding 
ON underground_keywords USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_semantic_cache_query_embedding 
ON semantic_cache USING ivfflat (query_embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_semantic_cache_location_embedding 
ON semantic_cache USING ivfflat (location_embedding vector_cosine_ops) WITH (lists = 100);

-- Additional indexes for semantic cache performance
CREATE INDEX IF NOT EXISTS idx_semantic_cache_expires ON semantic_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_semantic_cache_access_count ON semantic_cache(access_count DESC);
CREATE INDEX IF NOT EXISTS idx_semantic_cache_similarity_threshold ON semantic_cache(similarity_threshold);
CREATE INDEX IF NOT EXISTS idx_underground_keywords_category ON underground_keywords(category);
CREATE INDEX IF NOT EXISTS idx_underground_keywords_weight ON underground_keywords(weight DESC);

-- Function to find similar cached queries using vector similarity
CREATE OR REPLACE FUNCTION find_similar_cached_query(
  input_query_embedding vector(1536),
  input_location_embedding vector(1536),
  similarity_threshold float DEFAULT 0.85,
  result_limit integer DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  original_query text,
  location text,
  cached_results jsonb,
  query_similarity float,
  location_similarity float,
  combined_similarity float,
  access_count integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sc.id,
    sc.original_query,
    sc.location,
    sc.cached_results,
    (1 - (sc.query_embedding <=> input_query_embedding)) as query_similarity,
    (1 - (sc.location_embedding <=> input_location_embedding)) as location_similarity,
    -- Combined similarity with 70% weight on query, 30% on location
    (0.7 * (1 - (sc.query_embedding <=> input_query_embedding)) + 
     0.3 * (1 - (sc.location_embedding <=> input_location_embedding))) as combined_similarity,
    sc.access_count
  FROM semantic_cache sc
  WHERE sc.expires_at > now()
    AND (1 - (sc.query_embedding <=> input_query_embedding)) >= similarity_threshold
    AND (1 - (sc.location_embedding <=> input_location_embedding)) >= (similarity_threshold * 0.7)
  ORDER BY combined_similarity DESC, access_count DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to find relevant underground keywords for a query
CREATE OR REPLACE FUNCTION find_underground_keywords(
  query_embedding vector(1536),
  similarity_threshold float DEFAULT 0.75,
  result_limit integer DEFAULT 10
)
RETURNS TABLE (
  keyword text,
  category text,
  similarity float,
  weight float,
  relevance_score float
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    uk.keyword,
    uk.category,
    (1 - (uk.embedding <=> query_embedding)) as similarity,
    uk.weight,
    -- Relevance score combines similarity and keyword weight
    (1 - (uk.embedding <=> query_embedding)) * uk.weight as relevance_score
  FROM underground_keywords uk
  WHERE (1 - (uk.embedding <=> query_embedding)) >= similarity_threshold
  ORDER BY relevance_score DESC, similarity DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to update access count and last accessed time for semantic cache
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

-- Function to clean expired cache entries (enhanced version)
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS json AS $$
DECLARE
  search_deleted integer;
  location_deleted integer;
  semantic_deleted integer;
  result json;
BEGIN
  -- Delete from search_results
  DELETE FROM search_results WHERE expires_at < now();
  GET DIAGNOSTICS search_deleted = ROW_COUNT;
  
  -- Delete from location_cache
  DELETE FROM location_cache WHERE expires_at < now();
  GET DIAGNOSTICS location_deleted = ROW_COUNT;
  
  -- Delete from semantic_cache
  DELETE FROM semantic_cache WHERE expires_at < now();
  GET DIAGNOSTICS semantic_deleted = ROW_COUNT;
  
  -- Return cleanup statistics
  SELECT json_build_object(
    'search_results_deleted', search_deleted,
    'location_cache_deleted', location_deleted,
    'semantic_cache_deleted', semantic_deleted,
    'cleanup_time', now()
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get cache statistics with vector search metrics
CREATE OR REPLACE FUNCTION get_cache_statistics()
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'search_results_count', (SELECT COUNT(*) FROM search_results),
    'location_cache_count', (SELECT COUNT(*) FROM location_cache),
    'semantic_cache_count', (SELECT COUNT(*) FROM semantic_cache),
    'underground_keywords_count', (SELECT COUNT(*) FROM underground_keywords),
    'search_results_with_vectors', (SELECT COUNT(*) FROM search_results WHERE query_embedding IS NOT NULL),
    'location_cache_with_vectors', (SELECT COUNT(*) FROM location_cache WHERE input_embedding IS NOT NULL),
    'avg_semantic_cache_similarity_threshold', (SELECT AVG(similarity_threshold) FROM semantic_cache),
    'total_semantic_cache_accesses', (SELECT SUM(access_count) FROM semantic_cache),
    'statistics_generated_at', now()
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE underground_keywords IS 'Underground travel specific keywords with vector embeddings for semantic matching';
COMMENT ON TABLE semantic_cache IS 'Intelligent cache using vector similarity for query matching';
COMMENT ON FUNCTION find_similar_cached_query IS 'Finds cached results using vector similarity between queries and locations';
COMMENT ON FUNCTION find_underground_keywords IS 'Finds relevant underground travel keywords using semantic similarity';
COMMENT ON FUNCTION update_cache_access IS 'Updates access metrics for cache analytics';
COMMENT ON FUNCTION clean_expired_cache IS 'Enhanced cache cleanup with detailed statistics';
COMMENT ON FUNCTION get_cache_statistics IS 'Comprehensive cache statistics including vector search metrics';