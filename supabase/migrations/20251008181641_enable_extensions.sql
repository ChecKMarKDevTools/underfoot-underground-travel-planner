-- ============================================================================
-- EXTENSIONS: Enable required PostgreSQL extensions
-- ============================================================================
-- Must run FIRST before any schema that depends on these extensions
-- Production deployment: 2025-10-08

-- Vector similarity search (pgvector) - install in public schema for direct access
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;

-- Geospatial calculations (earthdistance requires cube)
CREATE EXTENSION IF NOT EXISTS cube WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS earthdistance WITH SCHEMA public;

-- Verify extensions are enabled
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    RAISE EXCEPTION 'vector extension failed to install';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'earthdistance') THEN
    RAISE EXCEPTION 'earthdistance extension failed to install';
  END IF;
  RAISE NOTICE 'All extensions enabled successfully';
END $$;
