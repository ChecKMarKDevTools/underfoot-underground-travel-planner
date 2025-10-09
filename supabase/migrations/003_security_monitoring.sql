-- Additional security measures and monitoring
-- Prevents database bloat and adds observability

-- Create trigger to limit total rows per table (prevent spam attacks)
CREATE OR REPLACE FUNCTION prevent_cache_bloat()
RETURNS TRIGGER AS $$
DECLARE
  row_count integer;
  max_rows integer := 10000;
BEGIN
  SELECT COUNT(*) INTO row_count FROM search_results;
  
  IF row_count >= max_rows THEN
    DELETE FROM search_results 
    WHERE id IN (
      SELECT id FROM search_results 
      ORDER BY created_at ASC 
      LIMIT 1000
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION prevent_location_cache_bloat()
RETURNS TRIGGER AS $$
DECLARE
  row_count integer;
  max_rows integer := 5000;
BEGIN
  SELECT COUNT(*) INTO row_count FROM location_cache;
  
  IF row_count >= max_rows THEN
    DELETE FROM location_cache 
    WHERE id IN (
      SELECT id FROM location_cache 
      ORDER BY created_at ASC 
      LIMIT 500
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers that fire before insert
CREATE TRIGGER enforce_search_results_limit
  BEFORE INSERT ON search_results
  FOR EACH ROW
  EXECUTE FUNCTION prevent_cache_bloat();

CREATE TRIGGER enforce_location_cache_limit
  BEFORE INSERT ON location_cache
  FOR EACH ROW
  EXECUTE FUNCTION prevent_location_cache_bloat();

-- Add size constraint to results_json (prevent huge payloads)
ALTER TABLE search_results
  ADD CONSTRAINT reasonable_json_size 
  CHECK (octet_length(results_json::text) < 1048576);

-- Create view for monitoring cache health
CREATE OR REPLACE VIEW cache_health AS
SELECT 
  'search_results' as table_name,
  COUNT(*) as total_rows,
  COUNT(*) FILTER (WHERE expires_at > now()) as valid_rows,
  COUNT(*) FILTER (WHERE expires_at <= now()) as expired_rows,
  ROUND(AVG(octet_length(results_json::text))::numeric, 2) as avg_json_size_bytes,
  MIN(created_at) as oldest_entry,
  MAX(created_at) as newest_entry
FROM search_results
UNION ALL
SELECT 
  'location_cache' as table_name,
  COUNT(*) as total_rows,
  COUNT(*) FILTER (WHERE expires_at > now()) as valid_rows,
  COUNT(*) FILTER (WHERE expires_at <= now()) as expired_rows,
  NULL as avg_json_size_bytes,
  MIN(created_at) as oldest_entry,
  MAX(created_at) as newest_entry
FROM location_cache;

-- Grant read access to cache_health view
GRANT SELECT ON cache_health TO anon, authenticated, service_role;

COMMENT ON VIEW cache_health IS 'Monitoring view for cache table health and statistics';
COMMENT ON FUNCTION prevent_cache_bloat IS 'Automatically removes oldest entries when table exceeds 10k rows';
COMMENT ON FUNCTION prevent_location_cache_bloat IS 'Automatically removes oldest entries when table exceeds 5k rows';
COMMENT ON CONSTRAINT reasonable_json_size ON search_results IS 'Prevents JSON payloads larger than 1MB';
