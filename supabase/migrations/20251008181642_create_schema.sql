-- ============================================================================
-- SCHEMA: Core tables for Underfoot caching system
-- ============================================================================
-- Production deployment: 2025-10-08
-- Tables: api_results_cache, location_cache, semantic_cache

-- ============================================================================
-- Table: api_results_cache
-- Raw API responses with event-based expiration (not TTL)
-- ============================================================================
CREATE TABLE api_results_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Source and data
  source text NOT NULL CHECK (source IN ('reddit', 'facebook', 'eventbrite', 'serp')),
  result_data jsonb NOT NULL,

  -- Location info (for filtering)
  location text NOT NULL,
  latitude decimal(10, 8),
  longitude decimal(11, 8),

  -- Event expiration (no TTL bullshit - expires when event is in past)
  event_date timestamptz NOT NULL DEFAULT (now() + interval '4 weeks'),

  -- Metadata
  created_at timestamptz DEFAULT now() NOT NULL,

  -- Constraints
  CONSTRAINT valid_lat_api CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
  CONSTRAINT valid_lng_api CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180))
);

-- Indexes for api_results_cache
CREATE INDEX idx_api_results_source ON api_results_cache(source);
CREATE INDEX idx_api_results_location ON api_results_cache(location);
CREATE INDEX idx_api_results_coords ON api_results_cache(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX idx_api_results_event_date ON api_results_cache(event_date);

COMMENT ON TABLE api_results_cache IS 'Raw API responses from Reddit, Facebook, Eventbrite, SERP. Expires when event_date is in past.';
COMMENT ON COLUMN api_results_cache.event_date IS 'Event occurrence date. Defaults to 4 weeks for always-open venues. Cache expires when date < now()';

-- ============================================================================
-- Table: location_cache
-- Location normalization cache with confidence scores
-- ============================================================================
CREATE TABLE location_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  raw_input text NOT NULL UNIQUE,
  normalized_location text NOT NULL,
  confidence float NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  raw_candidates jsonb DEFAULT '[]'::jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz NOT NULL,

  -- Constraints
  CONSTRAINT valid_confidence CHECK (confidence >= 0 AND confidence <= 1),
  CONSTRAINT valid_expiration_loc CHECK (expires_at > created_at)
);

-- Indexes for location_cache
CREATE INDEX idx_location_cache_raw_input ON location_cache(raw_input);
CREATE INDEX idx_location_cache_expires ON location_cache(expires_at);
CREATE INDEX idx_location_cache_confidence ON location_cache(confidence DESC);

COMMENT ON TABLE location_cache IS 'Geocoding/normalization cache with confidence scores';
COMMENT ON COLUMN location_cache.raw_input IS 'User input text, lowercased and trimmed';
COMMENT ON COLUMN location_cache.confidence IS 'Geocoding confidence score 0.0-1.0';

-- ============================================================================
-- Table: semantic_cache
-- Vector-based intent cache with geographic filtering
-- References api_results_cache instead of duplicating data
-- ============================================================================
CREATE TABLE semantic_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Intent (vectorized for similarity matching)
  intent text NOT NULL,
  intent_embedding vector(1536) NOT NULL,

  -- Location (geocoded, NOT vectorized - uses earthdistance)
  location text NOT NULL,
  city text,
  county text,
  region text,
  country text,
  postal_code text,
  latitude decimal(10, 8),
  longitude decimal(11, 8),

  -- References to actual cached data (not duplicating JSONB)
  result_ids uuid[] DEFAULT '{}',

  -- Access tracking
  access_count integer DEFAULT 1 NOT NULL,
  last_accessed timestamptz DEFAULT now() NOT NULL,

  -- Metadata
  created_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz NOT NULL,

  -- Constraints
  CONSTRAINT valid_lat CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
  CONSTRAINT valid_lng CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180)),
  CONSTRAINT valid_access_count CHECK (access_count >= 0),
  CONSTRAINT valid_expiration_sem CHECK (expires_at > created_at)
);

-- Indexes for semantic_cache
-- IVFFlat index for fast vector similarity (cosine distance)
CREATE INDEX idx_semantic_intent_embedding
  ON semantic_cache
  USING ivfflat (intent_embedding vector_cosine_ops)
  WITH (lists = 100);

-- Geographic indexes
CREATE INDEX idx_semantic_location ON semantic_cache(city, region, country);
CREATE INDEX idx_semantic_coords ON semantic_cache(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Maintenance indexes
CREATE INDEX idx_semantic_expires ON semantic_cache(expires_at);
CREATE INDEX idx_semantic_access_count ON semantic_cache(access_count DESC);
CREATE INDEX idx_semantic_last_accessed ON semantic_cache(last_accessed DESC);

COMMENT ON TABLE semantic_cache IS 'Vector-based semantic cache: 77% similarity threshold, 80-mile hard cutoff, exponential distance decay';
COMMENT ON COLUMN semantic_cache.intent_embedding IS 'OpenAI text-embedding-ada-002 (1536 dimensions)';
COMMENT ON COLUMN semantic_cache.result_ids IS 'Array of api_results_cache.id - references actual cached API data';
COMMENT ON COLUMN semantic_cache.access_count IS 'Number of times this cache entry was returned';
