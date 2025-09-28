-- Seed data for underground travel keywords
-- Note: This contains placeholder embeddings (zeros) that should be replaced with actual OpenAI embeddings
-- The real embeddings should be generated using OpenAI's text-embedding-ada-002 model

-- Insert underground transportation keywords
INSERT INTO underground_keywords (keyword, category, weight) VALUES
-- Transportation methods
('subway', 'transport', 1.0),
('metro', 'transport', 1.0),
('underground train', 'transport', 1.0),
('tube', 'transport', 0.9),
('underground railway', 'transport', 0.9),
('light rail', 'transport', 0.8),
('tram', 'transport', 0.7),
('monorail', 'transport', 0.6),
('underground bus', 'transport', 0.7),
('tunnel bus', 'transport', 0.7),

-- Underground locations and POIs
('underground station', 'location', 1.0),
('subway station', 'location', 1.0),
('metro station', 'location', 1.0),
('underground mall', 'poi', 0.8),
('underground shopping center', 'poi', 0.8),
('underground parking', 'poi', 0.6),
('underground walkway', 'poi', 0.7),
('pedestrian tunnel', 'poi', 0.7),
('underground passage', 'poi', 0.7),
('concourse', 'location', 0.6),

-- Activities and purposes
('commute', 'activity', 0.9),
('travel', 'activity', 1.0),
('journey', 'activity', 0.8),
('transportation', 'activity', 1.0),
('public transit', 'activity', 0.9),
('mass transit', 'activity', 0.8),
('urban mobility', 'activity', 0.7),
('getting around', 'activity', 0.8),
('navigation', 'activity', 0.7),
('route planning', 'activity', 0.8),

-- Geographic and urban terms
('downtown', 'location', 0.6),
('city center', 'location', 0.6),
('urban core', 'location', 0.5),
('business district', 'location', 0.5),
('transit hub', 'location', 0.8),
('transportation center', 'location', 0.8),
('interchange', 'location', 0.7),
('terminal', 'location', 0.6),
('depot', 'location', 0.5),

-- Underground-specific infrastructure
('platform', 'location', 0.7),
('track', 'location', 0.6),
('tunnel', 'location', 0.8),
('underground level', 'location', 0.7),
('basement level', 'location', 0.5),
('lower level', 'location', 0.6),
('sub-level', 'location', 0.6),
('mezzanine', 'location', 0.5),
('underground entrance', 'location', 0.7),
('underground exit', 'location', 0.7),

-- Time and schedule related
('schedule', 'activity', 0.6),
('timetable', 'activity', 0.6),
('frequency', 'activity', 0.5),
('arrival time', 'activity', 0.6),
('departure time', 'activity', 0.6),
('rush hour', 'activity', 0.7),
('peak hours', 'activity', 0.7),
('off-peak', 'activity', 0.6),

-- Accessibility and amenities
('accessible', 'feature', 0.7),
('elevator', 'feature', 0.6),
('escalator', 'feature', 0.6),
('stairs', 'feature', 0.5),
('wheelchair accessible', 'feature', 0.7),
('underground restroom', 'feature', 0.5),
('underground cafe', 'feature', 0.4),
('underground shop', 'feature', 0.4),

-- Navigation and wayfinding
('directions', 'activity', 0.8),
('map', 'activity', 0.7),
('route', 'activity', 0.8),
('path', 'activity', 0.6),
('connection', 'activity', 0.7),
('transfer', 'activity', 0.8),
('interchange', 'activity', 0.7),
('line', 'activity', 0.7),

-- Weather-related (underground advantages)
('weather protection', 'feature', 0.6),
('climate controlled', 'feature', 0.5),
('indoor', 'feature', 0.5),
('sheltered', 'feature', 0.6),

-- Safety and security
('safe', 'feature', 0.6),
('secure', 'feature', 0.6),
('well-lit', 'feature', 0.5),
('monitored', 'feature', 0.5),
('emergency exit', 'feature', 0.5)

ON CONFLICT (keyword) DO NOTHING;

-- Initialize all embeddings to zero vectors (placeholder)
-- These should be replaced with actual OpenAI embeddings in production
UPDATE underground_keywords 
SET embedding = array_fill(0, ARRAY[1536])::vector(1536)
WHERE embedding IS NULL;

-- Create a function to batch update embeddings (for future use)
CREATE OR REPLACE FUNCTION update_keyword_embeddings(
  keyword_embeddings jsonb
) RETURNS integer AS $$
DECLARE
  updated_count integer := 0;
  keyword_record record;
BEGIN
  -- Iterate through the provided embeddings
  FOR keyword_record IN 
    SELECT key as keyword, value as embedding_array
    FROM jsonb_each(keyword_embeddings)
  LOOP
    -- Update the embedding for this keyword
    UPDATE underground_keywords 
    SET 
      embedding = (keyword_record.embedding_array::text)::vector(1536),
      updated_at = now()
    WHERE keyword = keyword_record.keyword;
    
    IF FOUND THEN
      updated_count := updated_count + 1;
    END IF;
  END LOOP;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on the update function to service role
GRANT EXECUTE ON FUNCTION update_keyword_embeddings(jsonb) TO service_role;

COMMENT ON FUNCTION update_keyword_embeddings IS 'Batch updates keyword embeddings from OpenAI API responses';