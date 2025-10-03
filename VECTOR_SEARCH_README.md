# Vector Search & Intelligent Caching System

This system implements intelligent caching and search optimization using Supabase vector search capabilities for the Underfoot Underground Travel Planner.

## 🎯 Features

### Vector Search Capabilities

- **Semantic Similarity Matching**: Uses OpenAI embeddings to find similar queries even with different wording
- **Underground Keywords Database**: Pre-populated database of underground travel-specific terms
- **Multi-layered Cache Strategy**: Memory → Vector → Traditional → Database fallback
- **Intelligent TTL Management**: Adaptive cache expiration based on query popularity

### Performance Optimizations

- **Cache Warming**: Proactively caches related queries based on usage patterns
- **Batch Processing**: Efficient embedding generation with rate limiting
- **Memory Cache**: Fast in-process cache for frequently accessed results
- **Analytics & Metrics**: Comprehensive caching performance tracking

## 🗄️ Database Schema

### New Tables

#### `underground_keywords`

Stores underground travel keywords with vector embeddings:

```sql
- id (uuid, primary key)
- keyword (text, unique)
- category (text) -- 'transport', 'location', 'activity', 'poi'
- embedding (vector(1536))
- weight (float) -- relevance weight for scoring
- created_at, updated_at (timestamptz)
```

#### `semantic_cache`

Intelligent cache with vector similarity matching:

```sql
- id (uuid, primary key)
- original_query, normalized_query (text)
- query_embedding, location_embedding (vector(1536))
- cached_results (jsonb)
- similarity_threshold (float)
- access_count (integer)
- last_accessed, created_at, expires_at (timestamptz)
```

### Enhanced Existing Tables

- Added vector columns to `search_results` and `location_cache`
- New vector similarity indexes for fast cosine similarity search

## 🚀 Setup & Deployment

### 1. Database Migration

```bash
# Run the new migrations
supabase migration up
```

### 2. Environment Variables

Add to your `.env` file:

```bash
OPENAI_API_KEY=your_openai_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Seed Data & Embeddings

```bash
# Populate underground keywords (one-time setup)
curl -X POST http://localhost:3000/underfoot/admin/populate-embeddings
```

### 4. Enable pgvector Extension

In your Supabase SQL editor:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

## 📡 API Endpoints

### Core Search (Enhanced)

```bash
POST /underfoot/search
{
  "chatInput": "underground spots in Seattle",
  "force": false
}
```

Now includes:

- Vector similarity cache lookup
- Underground keyword matching
- Enhanced query analysis
- Multi-source cache fallback

### Cache Management

#### Get Analytics

```bash
GET /underfoot/cache/analytics
```

Returns:

```json
{
  "database": { "semantic_cache_count": 150, ... },
  "memory": { "size": 25, "hit_rate": "78.5%", ... },
  "config": { "similarity_threshold": 0.85, ... }
}
```

#### Manual Cache Cleanup

```bash
POST /underfoot/cache/cleanup
```

#### Reset Metrics

```bash
POST /underfoot/cache/reset-metrics
```

### Vector Search Testing

#### Test Vector Similarity

```bash
POST /underfoot/vector/test
{
  "query": "underground transportation",
  "location": "New York"
}
```

Returns matching cached results and relevant keywords.

## 🔧 Configuration

### Vector Search Settings

Located in `backend/src/services/supabaseService.js`:

```javascript
const VECTOR_CONFIG = {
  embeddingModel: 'text-embedding-ada-002',
  embeddingDimensions: 1536,
  similarityThreshold: 0.85,      // Minimum similarity for cache hits
  cacheTtlMinutes: 30,            // Default cache TTL
  maxCacheResults: 5,             // Max results per similarity search
};
```

### Cache Management Settings

Located in `backend/src/services/cacheManagerService.js`:

```javascript
const CACHE_CONFIG = {
  defaultTtlMinutes: 30,
  popularQueryTtlMinutes: 120,     // Extended TTL for popular queries
  popularityThreshold: 5,          // Access count threshold
  cleanupIntervalHours: 6,         // Automatic cleanup frequency
  maxCacheSize: 10000,             // Max total cache entries
  similarityThreshold: 0.85,       // Vector similarity threshold
};
```

## 🧠 How It Works

### 1. Query Processing

1. **Memory Cache Check**: Fastest lookup for recently accessed queries
2. **Vector Similarity Search**: Semantic matching using embeddings
3. **Traditional Cache**: Hash-based exact match fallback
4. **Fresh Search**: If no cache hit, perform new search and store with embeddings

### 2. Intelligent Caching

1. **Adaptive TTL**: Popular queries cached longer
2. **Semantic Storage**: Results stored with vector embeddings
3. **Cache Warming**: Related queries pre-cached based on patterns
4. **Smart Eviction**: Low-value entries removed during cleanup

### 3. Underground Keywords

1. **Semantic Enhancement**: Query matched against underground travel terms
2. **Context Enrichment**: Relevant keywords added to search context
3. **Weighted Scoring**: Keywords have relevance weights for better matching

## 📊 Performance Monitoring

### Cache Hit Rates

- **Memory Cache**: Fastest, highest priority
- **Vector Cache**: Semantic similarity matches
- **Traditional Cache**: Exact hash matches
- **Database**: Fresh queries

### Analytics Available

- Hit/miss ratios by cache type
- Average response times
- Query popularity metrics
- Cache size and growth patterns
- Semantic similarity distributions

## 🛠️ Development & Testing

### Testing Vector Search

```bash
# Test semantic similarity
curl -X POST http://localhost:3000/underfoot/vector/test \
  -H "Content-Type: application/json" \
  -d '{"query": "subway spots", "location": "NYC"}'
```

### Cache Analytics

```bash
# Get detailed cache statistics
curl http://localhost:3000/underfoot/cache/analytics
```

### Debugging

Enable debug logging in services:

```javascript
const CACHE_CONFIG = {
  performanceLogEnabled: true,
  // ... other config
};
```

## 🔐 Security Considerations

### Row Level Security (RLS)

- **underground\_keywords**: Read-only for public, write for service role only
- **semantic\_cache**: Full access for caching operations
- **Enhanced policies**: More restrictive than original prototype setup

### API Access

- **Admin endpoints**: Require service-level access
- **Cache operations**: Public read, restricted write/delete
- **Embedding generation**: Rate limited via OpenAI API

## 🚧 Future Enhancements

### Phase 2 (Python Backend)

- `vectorService.py` ready for Python backend integration
- Async/await support for better performance
- Advanced analytics and ML-based cache warming

### Phase 3 (Advanced Features)

- Query intent classification
- Location-specific embedding fine-tuning
- Collaborative filtering for recommendations
- Real-time cache optimization

## 📝 Usage Examples

### Basic Search with Vector Caching

```javascript
import { intelligentCacheLookup, smartCacheStore } from './services/cacheManagerService.js';

// Check cache with semantic similarity
const cacheResult = await intelligentCacheLookup("underground bars", "Portland");

if (cacheResult.cached) {
  console.log(`Cache hit from ${cacheResult.source}`);
  return cacheResult.results;
}

// Perform search and store with intelligent caching
const results = await performSearch(query, location);
await smartCacheStore(query, location, results);
```

### Working with Underground Keywords

```javascript
import { findUndergroundKeywords } from './services/supabaseService.js';

const keywords = await findUndergroundKeywords("transportation options");
console.log("Relevant terms:", keywords.map(k => k.keyword));
// Output: ["subway", "metro", "underground train", "tunnel", ...]
```

## 🔗 Related Documentation

- [Supabase Vector Documentation](https://supabase.com/docs/guides/ai/vector-columns)
- [OpenAI Embeddings API](https://platform.openai.com/docs/guides/embeddings)
- [pgvector Extension](https://github.com/pgvector/pgvector)

---

This system provides a robust foundation for intelligent search caching that learns from user behavior and provides semantic understanding of underground travel queries.
