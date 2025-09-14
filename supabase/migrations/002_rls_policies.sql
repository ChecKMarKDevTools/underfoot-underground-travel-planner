-- Row Level Security policies for Underfoot cache tables
-- Enables public access for prototype (no auth required)

-- Enable RLS on both tables
ALTER TABLE search_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_cache ENABLE ROW LEVEL SECURITY;

-- Allow unrestricted public access for prototype usage
-- Note: In production, these would be more restrictive based on auth requirements
CREATE POLICY "Allow public read access on search_results" 
  ON search_results FOR SELECT 
  USING (true);

CREATE POLICY "Allow public write access on search_results" 
  ON search_results FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Allow public update access on search_results" 
  ON search_results FOR UPDATE 
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow public delete access on search_results" 
  ON search_results FOR DELETE 
  USING (true);

CREATE POLICY "Allow public read access on location_cache" 
  ON location_cache FOR SELECT 
  USING (true);

CREATE POLICY "Allow public write access on location_cache" 
  ON location_cache FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Allow public update access on location_cache" 
  ON location_cache FOR UPDATE 
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow public delete access on location_cache" 
  ON location_cache FOR DELETE 
  USING (true);

-- Grant necessary permissions to anon and authenticated roles
GRANT ALL ON search_results TO anon, authenticated;
GRANT ALL ON location_cache TO anon, authenticated;

-- Grant usage on sequences (needed for UUID generation)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;