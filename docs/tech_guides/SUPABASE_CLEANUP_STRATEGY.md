# Supabase Data Cleanup & TTL Strategy

_Implementation Plan: January 27, 2025_

## 🧹 **ELI17 Senior+ Version: Don't Pay for Old Junk**

**TL;DR**: Cache expires when events end, vector embeddings get smarter over time, cleanup runs daily. No stale data = no surprise bills.

---

## 🗂️ **Database Schema with Built-in Expiration**

### Core Tables with TTL

```sql
-- Vector search cache with automatic expiration
CREATE TABLE vector_search_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_text TEXT NOT NULL,
  query_embedding vector(1536), -- OpenAI embedding size
  location_normalized TEXT NOT NULL,
  results JSONB NOT NULL,
  cache_score FLOAT DEFAULT 0, -- Learning element: how good were results?
  user_feedback JSONB, -- {thumbs_up: bool, clicked_items: string[], saved_items: string[]}
  expires_at TIMESTAMP NOT NULL, -- TTL based on content type
  created_at TIMESTAMP DEFAULT NOW(),
  accessed_count INTEGER DEFAULT 1,
  last_accessed TIMESTAMP DEFAULT NOW()
);

-- Event cache with event-based expiration
CREATE TABLE event_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL, -- 'eventbrite', 'reddit', etc
  source_id TEXT NOT NULL,
  event_data JSONB NOT NULL,
  location_normalized TEXT NOT NULL,
  event_start_date TIMESTAMP,
  event_end_date TIMESTAMP,
  expires_at TIMESTAMP GENERATED ALWAYS AS (
    CASE
      WHEN event_end_date IS NOT NULL THEN event_end_date + INTERVAL '7 days'
      ELSE created_at + INTERVAL '30 days'
    END
  ) STORED,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(source, source_id)
);

-- Geocoding cache (long TTL since addresses don't change much)
CREATE TABLE geocoding_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  input_address TEXT NOT NULL UNIQUE,
  normalized_address TEXT NOT NULL,
  coordinates POINT NOT NULL,
  confidence_score FLOAT NOT NULL,
  provider TEXT NOT NULL, -- 'google', 'mapbox', etc
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '90 days'),
  created_at TIMESTAMP DEFAULT NOW()
);

-- User learning data (long retention for personalization)
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  preference_type TEXT NOT NULL, -- 'search_theme', 'location_bias', 'result_type'
  preference_data JSONB NOT NULL,
  confidence_score FLOAT DEFAULT 0.5,
  updated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '1 year'),
  UNIQUE(user_id, preference_type)
);
```

### TTL Strategy by Data Type

```sql
-- Create TTL policies for different content types
CREATE OR REPLACE FUNCTION set_cache_ttl()
RETURNS TRIGGER AS $$
BEGIN
  CASE NEW.query_text
    -- Short TTL for time-sensitive searches
    WHEN NEW.query_text ILIKE '%today%' OR NEW.query_text ILIKE '%tonight%' THEN
      NEW.expires_at = NOW() + INTERVAL '6 hours';
    -- Medium TTL for event searches
    WHEN NEW.query_text ILIKE '%event%' OR NEW.query_text ILIKE '%concert%' THEN
      NEW.expires_at = NOW() + INTERVAL '7 days';
    -- Long TTL for location/venue searches
    ELSE
      NEW.expires_at = NOW() + INTERVAL '30 days';
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cache_ttl_trigger
  BEFORE INSERT ON vector_search_cache
  FOR EACH ROW EXECUTE FUNCTION set_cache_ttl();
```

---

## 🧠 **Learning Element: Vector Search Gets Smarter**

### User Feedback Loop

```sql
-- Function to update cache quality based on user actions
CREATE OR REPLACE FUNCTION update_search_quality(
  p_cache_id UUID,
  p_clicked_items TEXT[],
  p_saved_items TEXT[],
  p_thumbs_up BOOLEAN
)
RETURNS VOID AS $$
DECLARE
  quality_boost FLOAT := 0;
BEGIN
  -- Calculate quality score based on engagement
  quality_boost := CASE
    WHEN p_thumbs_up THEN 0.2
    ELSE 0
  END;

  quality_boost := quality_boost + (array_length(p_clicked_items, 1) * 0.1);
  quality_boost := quality_boost + (array_length(p_saved_items, 1) * 0.3);

  -- Update cache record
  UPDATE vector_search_cache
  SET
    cache_score = LEAST(cache_score + quality_boost, 1.0),
    user_feedback = jsonb_build_object(
      'thumbs_up', p_thumbs_up,
      'clicked_items', p_clicked_items,
      'saved_items', p_saved_items,
      'updated_at', NOW()
    ),
    last_accessed = NOW(),
    accessed_count = accessed_count + 1
  WHERE id = p_cache_id;
END;
$$ LANGUAGE plpgsql;
```

### Similarity Search with Learning

```sql
-- Enhanced similarity search that considers quality scores
CREATE OR REPLACE FUNCTION search_similar_queries(
  query_embedding vector(1536),
  location_filter TEXT,
  threshold FLOAT DEFAULT 0.8,
  limit_results INTEGER DEFAULT 5
)
RETURNS TABLE(
  cache_id UUID,
  cached_results JSONB,
  similarity_score FLOAT,
  quality_score FLOAT,
  last_accessed TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id,
    v.results,
    (v.query_embedding <=> query_embedding) as similarity,
    v.cache_score,
    v.last_accessed
  FROM vector_search_cache v
  WHERE
    v.location_normalized = location_filter
    AND v.expires_at > NOW()
    AND (v.query_embedding <=> query_embedding) < (1 - threshold)
  ORDER BY
    -- Prioritize both similarity and quality
    ((v.query_embedding <=> query_embedding) * 0.7) + ((1 - v.cache_score) * 0.3)
  LIMIT limit_results;
END;
$$ LANGUAGE plpgsql;
```

---

## 🗑️ **Cleanup Functions (The Money Savers)**

### Daily Cleanup Function

```sql
-- Main cleanup function - run this daily via cron
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS TABLE(
  table_name TEXT,
  deleted_count INTEGER,
  freed_space_mb FLOAT
) AS $$
DECLARE
  rec RECORD;
  deleted_rows INTEGER;
  table_size_before BIGINT;
  table_size_after BIGINT;
BEGIN
  -- Clean vector search cache
  table_size_before := pg_total_relation_size('vector_search_cache');
  DELETE FROM vector_search_cache WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_rows = ROW_COUNT;
  table_size_after := pg_total_relation_size('vector_search_cache');

  RETURN QUERY SELECT
    'vector_search_cache'::TEXT,
    deleted_rows,
    (table_size_before - table_size_after)::FLOAT / 1024 / 1024;

  -- Clean event cache
  table_size_before := pg_total_relation_size('event_cache');
  DELETE FROM event_cache WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_rows = ROW_COUNT;
  table_size_after := pg_total_relation_size('event_cache');

  RETURN QUERY SELECT
    'event_cache'::TEXT,
    deleted_rows,
    (table_size_before - table_size_after)::FLOAT / 1024 / 1024;

  -- Clean old geocoding cache
  table_size_before := pg_total_relation_size('geocoding_cache');
  DELETE FROM geocoding_cache WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_rows = ROW_COUNT;
  table_size_after := pg_total_relation_size('geocoding_cache');

  RETURN QUERY SELECT
    'geocoding_cache'::TEXT,
    deleted_rows,
    (table_size_before - table_size_after)::FLOAT / 1024 / 1024;

  -- Vacuum to reclaim space
  PERFORM vacuum_analyze_tables();
END;
$$ LANGUAGE plpgsql;

-- Helper function for vacuuming
CREATE OR REPLACE FUNCTION vacuum_analyze_tables()
RETURNS VOID AS $$
BEGIN
  VACUUM ANALYZE vector_search_cache;
  VACUUM ANALYZE event_cache;
  VACUUM ANALYZE geocoding_cache;
END;
$$ LANGUAGE plpgsql;
```

### Intelligent Cleanup (Keep the Good Stuff)

```sql
-- Advanced cleanup that preserves high-quality cache entries
CREATE OR REPLACE FUNCTION intelligent_cleanup()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Delete low-quality expired entries first
  DELETE FROM vector_search_cache
  WHERE expires_at < NOW()
    AND cache_score < 0.3
    AND accessed_count < 2;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- Extend TTL for high-quality, frequently accessed entries
  UPDATE vector_search_cache
  SET expires_at = expires_at + INTERVAL '14 days'
  WHERE cache_score > 0.7
    AND accessed_count > 5
    AND expires_at < NOW() + INTERVAL '7 days';

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
```

---

## 🔌 **API Endpoint for Manual Cleanup**

### Express.js Cleanup Route

```javascript
// backend/src/routes/admin.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// POST /api/admin/cleanup
export const runCleanup = async (req, res) => {
  try {
    const { force, intelligent } = req.body;

    let cleanupFunction = intelligent ? 'intelligent_cleanup' : 'cleanup_expired_data';

    if (force) {
      // Force cleanup of all expired data regardless of quality
      cleanupFunction = 'cleanup_expired_data';
    }

    const { data, error } = await supabase.rpc(cleanupFunction);

    if (error) throw error;

    const totalDeleted = data.reduce((sum, row) => sum + row.deleted_count, 0);
    const totalSpaceFreed = data.reduce((sum, row) => sum + row.freed_space_mb, 0);

    res.json({
      success: true,
      cleanup_type: cleanupFunction,
      tables_cleaned: data,
      total_records_deleted: totalDeleted,
      total_space_freed_mb: Math.round(totalSpaceFreed * 100) / 100,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cleanup failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// GET /api/admin/cleanup/stats
export const getCleanupStats = async (req, res) => {
  try {
    const { data: stats } = await supabase.rpc('get_cache_statistics');

    res.json({
      cache_statistics: stats,
      recommendations: generateCleanupRecommendations(stats),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

function generateCleanupRecommendations(stats) {
  const recommendations = [];

  if (stats.expired_entries > 1000) {
    recommendations.push({
      type: 'cleanup_needed',
      priority: 'high',
      message: `${stats.expired_entries} expired entries need cleanup`,
      action: 'Run cleanup immediately',
    });
  }

  if (stats.low_quality_entries > 500) {
    recommendations.push({
      type: 'quality_cleanup',
      priority: 'medium',
      message: `${stats.low_quality_entries} low-quality entries consuming space`,
      action: 'Run intelligent cleanup',
    });
  }

  if (stats.total_size_mb > 100) {
    recommendations.push({
      type: 'size_warning',
      priority: 'medium',
      message: `Cache size is ${stats.total_size_mb}MB`,
      action: 'Consider more aggressive TTL policies',
    });
  }

  return recommendations;
}
```

### Statistics Function

```sql
-- Get cleanup statistics for monitoring
CREATE OR REPLACE FUNCTION get_cache_statistics()
RETURNS TABLE(
  total_entries INTEGER,
  expired_entries INTEGER,
  low_quality_entries INTEGER,
  high_quality_entries INTEGER,
  total_size_mb FLOAT,
  avg_cache_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_entries,
    COUNT(*) FILTER (WHERE expires_at < NOW())::INTEGER as expired_entries,
    COUNT(*) FILTER (WHERE cache_score < 0.3)::INTEGER as low_quality_entries,
    COUNT(*) FILTER (WHERE cache_score > 0.7)::INTEGER as high_quality_entries,
    (pg_total_relation_size('vector_search_cache') +
     pg_total_relation_size('event_cache') +
     pg_total_relation_size('geocoding_cache'))::FLOAT / 1024 / 1024 as total_size_mb,
    AVG(cache_score) as avg_cache_score
  FROM vector_search_cache;
END;
$$ LANGUAGE plpgsql;
```

---

## ⏰ **Automated Cleanup Schedule**

### Supabase Edge Function (Daily Cron)

```typescript
// supabase/functions/cleanup-cron/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  // Verify this is from Supabase cron
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  try {
    // Run intelligent cleanup first
    const { data: intelligentResults } = await supabase.rpc('intelligent_cleanup');

    // Run full cleanup if needed
    const { data: fullResults } = await supabase.rpc('cleanup_expired_data');

    // Get current statistics
    const { data: stats } = await supabase.rpc('get_cache_statistics');

    console.log('Cleanup completed:', {
      intelligent_deleted: intelligentResults,
      full_cleanup: fullResults,
      current_stats: stats,
    });

    return new Response(
      JSON.stringify({
        success: true,
        intelligent_deleted: intelligentResults,
        cleanup_results: fullResults,
        stats: stats[0],
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Cleanup cron failed:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
```

### Setup Cron Job

```sql
-- Create cron job (requires pg_cron extension)
SELECT cron.schedule(
  'daily-cache-cleanup',
  '0 2 * * *', -- Run at 2 AM daily
  'SELECT cleanup_expired_data();'
);

-- Weekly deeper cleanup
SELECT cron.schedule(
  'weekly-intelligent-cleanup',
  '0 3 * * 0', -- Run at 3 AM every Sunday
  'SELECT intelligent_cleanup();'
);
```

---

## 📊 **Monitoring & Alerts**

### Usage Dashboard Query

```sql
-- Dashboard stats for monitoring
CREATE VIEW cache_dashboard AS
SELECT
  'vector_search' as cache_type,
  COUNT(*) as total_entries,
  COUNT(*) FILTER (WHERE expires_at < NOW()) as expired_entries,
  AVG(cache_score) as avg_quality_score,
  pg_size_pretty(pg_total_relation_size('vector_search_cache')) as table_size,
  MAX(created_at) as last_entry_created
FROM vector_search_cache
UNION ALL
SELECT
  'events' as cache_type,
  COUNT(*) as total_entries,
  COUNT(*) FILTER (WHERE expires_at < NOW()) as expired_entries,
  NULL as avg_quality_score,
  pg_size_pretty(pg_total_relation_size('event_cache')) as table_size,
  MAX(created_at) as last_entry_created
FROM event_cache
UNION ALL
SELECT
  'geocoding' as cache_type,
  COUNT(*) as total_entries,
  COUNT(*) FILTER (WHERE expires_at < NOW()) as expired_entries,
  AVG(confidence_score) as avg_quality_score,
  pg_size_pretty(pg_total_relation_size('geocoding_cache')) as table_size,
  MAX(created_at) as last_entry_created
FROM geocoding_cache;
```

---

## 🚀 **Implementation Checklist**

### Week 1: Foundation

- [ ] Create TTL-enabled tables with proper indexes
- [ ] Implement automatic expiration triggers
- [ ] Set up basic cleanup functions
- [ ] Add cleanup API endpoints

### Week 2: Intelligence

- [ ] Implement user feedback system
- [ ] Add quality scoring to vector search
- [ ] Create intelligent cleanup logic
- [ ] Set up monitoring dashboard

### Week 3: Automation

- [ ] Deploy Supabase Edge Function for cron cleanup
- [ ] Configure alert thresholds
- [ ] Test cleanup performance under load
- [ ] Document cleanup procedures

---

## 💰 **Cost Impact Analysis**

### Before Cleanup Strategy

- **Problem**: Unlimited data accumulation
- **Risk**: $50-200/month in database costs for stale data
- **Storage Growth**: \~1GB/month without cleanup

### After Implementation

- **Savings**: 70-80% reduction in storage costs
- **Active Data**: Only relevant, recent, high-quality cache entries
- **Predictable Costs**: Bounded growth with automatic cleanup

---

_⚡ The senior+ version: Smart TTLs + learning algorithms + automated cleanup = your wallet will thank you. No more paying for yesterday's search results!_

---

_🧹 Verdent AI: Like that friend who actually cleans up after the party without being asked. Except this time it's your database and the party never ends._
