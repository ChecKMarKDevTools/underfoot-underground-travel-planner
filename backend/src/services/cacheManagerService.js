/\*\*

- Advanced cache management with TTL, warming strategies, and analytics
- Provides intelligent caching operations for the Underfoot application
  \*/

import {
supabaseAdmin,
findSimilarCachedResults,
setSemanticCachedResults,
VECTOR\_CONFIG,
} from './supabaseService.js';

// Cache management configuration
const CACHE\_CONFIG = {
// TTL strategies
defaultTtlMinutes: 30,
popularQueryTtlMinutes: 120,
locationCacheTtlHours: 24,

// Warming strategies
warmupBatchSize: 5,
warmupDelayMs: 1000,
popularityThreshold: 5, // queries accessed 5+ times are "popular"

// Cleanup strategies
cleanupIntervalHours: 6,
maxCacheSize: 10000,
evictionBatchSize: 100,

// Analytics
metricsRetentionDays: 30,
performanceLogEnabled: true,
};

// In-memory cache for frequently accessed embeddings and hot data
const memoryCache = new Map();
const cacheMetrics = {
hits: 0,
misses: 0,
vectorHits: 0,
vectorMisses: 0,
totalQueries: 0,
avgResponseTime: 0,
lastReset: Date.now(),
};

/\*\*

- Intelligent cache lookup with fallback strategies
  \*/
  const intelligentCacheLookup = async (query, location, options = {}) => {
  const startTime = Date.now();
  cacheMetrics.totalQueries++;

try {
// Memory cache check first (fastest)
const memoryKey = `${query}|${location}`.toLowerCase();
if (memoryCache.has(memoryKey)) {
const cached = memoryCache.get(memoryKey);
if (cached.expires > Date.now()) {
cacheMetrics.hits++;
logPerformance('memory\_hit', Date.now() - startTime);
return {
cached: true,
source: 'memory',
results: cached.data,
similarity: 1.0,
};
} else {
memoryCache.delete(memoryKey);
}
}

```
// Vector similarity search
const vectorResult = await findSimilarCachedResults(
  query,
  location,
  options.similarityThreshold || VECTOR_CONFIG.similarityThreshold,
);

if (vectorResult) {
  cacheMetrics.vectorHits++;

  // Store in memory cache for future fast access
  const memoryEntry = {
    data: vectorResult,
    expires: Date.now() + CACHE_CONFIG.defaultTtlMinutes * 60 * 1000,
    accessCount: 1,
    lastAccessed: Date.now(),
  };
  memoryCache.set(memoryKey, memoryEntry);

  logPerformance('vector_hit', Date.now() - startTime);
  return {
    cached: true,
    source: 'vector',
    results: vectorResult,
    similarity: options.similarity || 0.85,
  };
}

cacheMetrics.misses++;
logPerformance('cache_miss', Date.now() - startTime);
return {
  cached: false,
  source: null,
  results: null,
};
```

} catch (error) {
console.error('Intelligent cache lookup error:', error);
cacheMetrics.misses++;
return {
cached: false,
source: null,
results: null,
error: error.message,
};
}
};

/\*\*

- Smart cache storage with adaptive TTL
  \*/
  const smartCacheStore = async (query, location, results, \_options = {}) => {
  try {
  // Determine TTL based on query popularity and characteristics
  const ttlMinutes = await calculateAdaptiveTtl(query, location);

  // Store in persistent cache
  const stored = await setSemanticCachedResults(query, location, results, ttlMinutes);

  if (stored) {
  // Also store in memory cache for immediate access
  const memoryKey = `${query}|${location}`.toLowerCase();
  const memoryEntry = {
  data: results,
  expires: Date.now() + ttlMinutes \* 60 \* 1000,
  accessCount: 1,
  lastAccessed: Date.now(),
  };
  memoryCache.set(memoryKey, memoryEntry);

  // Trigger background cache warming for related queries
  triggerCacheWarming(query, location);
  }

  return stored;
  } catch (error) {
  console.error('Smart cache store error:', error);
  return false;
  }
  };

/\*\*

- Calculate adaptive TTL based on query characteristics
  \*/
  const calculateAdaptiveTtl = async (query, location) => {
  try {
  if (!supabaseAdmin) {
  return CACHE\_CONFIG.defaultTtlMinutes;
  }

  // Check query popularity
  const { data: popularityData } = await supabaseAdmin
  .from('semantic\_cache')
  .select('access\_count')
  .ilike('original\_query', `%${query.toLowerCase()}%`)
  .gte('access\_count', CACHE\_CONFIG.popularityThreshold)
  .limit(1);

  if (popularityData && popularityData.length > 0) {
  return CACHE\_CONFIG.popularQueryTtlMinutes;
  }

  // Check for location-specific caching patterns
  const { data: locationData } = await supabaseAdmin
  .from('semantic\_cache')
  .select('access\_count')
  .ilike('location', `%${location.toLowerCase()}%`)
  .gte('access\_count', CACHE\_CONFIG.popularityThreshold)
  .limit(1);

  if (locationData && locationData.length > 0) {
  return CACHE\_CONFIG.popularQueryTtlMinutes;
  }

  return CACHE\_CONFIG.defaultTtlMinutes;
  } catch (error) {
  console.error('Adaptive TTL calculation error:', error);
  return CACHE\_CONFIG.defaultTtlMinutes;
  }
  };

/\*\*

- Background cache warming for related queries
  \*/
  const triggerCacheWarming = async (query, location) => {
  // Run in background, don't await
  setTimeout(async () => {
  try {
  await warmRelatedQueries(query, location);
  } catch (error) {
  console.error('Cache warming error:', error);
  }
  }, CACHE\_CONFIG.warmupDelayMs);
  };

/\*\*

- Warm cache for related queries using vector similarity
  \*/
  const warmRelatedQueries = async (originalQuery, \_originalLocation) => {
  if (!supabaseAdmin) {
  return;
  }

try {
// Find similar queries that might benefit from warming
const { data: similarQueries } = await supabaseAdmin
.from('semantic\_cache')
.select('original\_query, location, access\_count')
.neq('original\_query', originalQuery)
.gte('access\_count', 2)
.order('access\_count', { ascending: false })
.limit(CACHE\_CONFIG.warmupBatchSize);

```
if (!similarQueries || similarQueries.length === 0) {
  return;
}

console.log(`Warming ${similarQueries.length} related queries...`);

// Process warming in small batches to avoid overwhelming the system
for (const queryData of similarQueries) {
  // Check if already cached
  const existing = await intelligentCacheLookup(queryData.original_query, queryData.location);

  if (!existing.cached) {
    // This would trigger actual API calls in a real scenario
    // For now, we just log the warming opportunity
    console.log(
      `Cache warming opportunity: "${queryData.original_query}" in ${queryData.location}`,
    );
  }

  // Small delay between operations
  await new Promise((resolve) => setTimeout(resolve, 100));
}
```

} catch (error) {
console.error('Related queries warming error:', error);
}
};

/\*\*

- Automated cache cleanup with intelligent eviction
  \*/
  const intelligentCacheCleanup = async () => {
  if (!supabaseAdmin) {
  return { success: false, reason: 'No admin access' };
  }

try {
console.log('Starting intelligent cache cleanup...');

```
// Clean expired entries first
const { data: cleanupResult } = await supabaseAdmin.rpc('clean_expired_cache');

// Check cache size and perform eviction if needed
const { data: cacheStats } = await supabaseAdmin.rpc('get_cache_statistics');
const totalCacheSize =
  (cacheStats?.semantic_cache_count || 0) + (cacheStats?.search_results_count || 0);

if (totalCacheSize > CACHE_CONFIG.maxCacheSize) {
  await performIntelligentEviction();
}

// Clean memory cache
cleanMemoryCache();

console.log('Cache cleanup completed:', cleanupResult);
return {
  success: true,
  cleaned: cleanupResult,
  totalSize: totalCacheSize,
};
```

} catch (error) {
console.error('Intelligent cache cleanup error:', error);
return { success: false, error: error.message };
}
};

/\*\*

- Evict least valuable cache entries
  \*/
  const performIntelligentEviction = async () => {
  try {
  // Evict entries with low access counts and old last\_accessed times
  const { error: evictionError } = await supabaseAdmin
  .from('semantic\_cache')
  .delete()
  .lt('access\_count', 2)
  .lt('last\_accessed', new Date(Date.now() - 7 \* 24 \* 60 \* 60 \* 1000).toISOString())
  .limit(CACHE\_CONFIG.evictionBatchSize);

  if (evictionError) {
  console.error('Cache eviction error:', evictionError);
  } else {
  console.log('Performed intelligent eviction of low-value cache entries');
  }
  } catch (error) {
  console.error('Intelligent eviction error:', error);
  }
  };

/\*\*

- Clean expired entries from memory cache
  \*/
  const cleanMemoryCache = () => {
  const now = Date.now();
  let cleanedCount = 0;

for (const \[key, entry] of memoryCache.entries()) {
if (entry.expires < now) {
memoryCache.delete(key);
cleanedCount++;
}
}

if (cleanedCount > 0) {
console.log(`Cleaned ${cleanedCount} expired entries from memory cache`);
}
};

/\*\*

- Get comprehensive cache analytics
  \*/
  const getCacheAnalytics = async () => {
  try {
  const dbStats = supabaseAdmin
  ? await supabaseAdmin.rpc('get\_cache\_statistics')
  : { data: null };

  const hitRate =
  cacheMetrics.totalQueries > 0
  ? ((cacheMetrics.hits / cacheMetrics.totalQueries) \* 100).toFixed(2)
  : 0;

  const vectorHitRate =
  cacheMetrics.vectorHits + cacheMetrics.vectorMisses > 0
  ? (
  (cacheMetrics.vectorHits / (cacheMetrics.vectorHits + cacheMetrics.vectorMisses)) \*
  100
  ).toFixed(2)
  : 0;

  return {
  database: dbStats.data,
  memory: {
  size: memoryCache.size,
  hitRate: `${hitRate}%`,
  vectorHitRate: `${vectorHitRate}%`,
  totalQueries: cacheMetrics.totalQueries,
  avgResponseTime: `${cacheMetrics.avgResponseTime}ms`,
  },
  config: CACHE\_CONFIG,
  lastReset: new Date(cacheMetrics.lastReset).toISOString(),
  };
  } catch (error) {
  console.error('Cache analytics error:', error);
  return { error: error.message };
  }
  };

/\*\*

- Reset cache metrics
  \*/
  const resetCacheMetrics = () => {
  cacheMetrics.hits = 0;
  cacheMetrics.misses = 0;
  cacheMetrics.vectorHits = 0;
  cacheMetrics.vectorMisses = 0;
  cacheMetrics.totalQueries = 0;
  cacheMetrics.avgResponseTime = 0;
  cacheMetrics.lastReset = Date.now();

console.log('Cache metrics reset');
};

/\*\*

- Log performance metrics
  \*/
  const logPerformance = (operation, duration) => {
  if (CACHE\_CONFIG.performanceLogEnabled) {
  // Update running average
  cacheMetrics.avgResponseTime =
  (cacheMetrics.avgResponseTime \* (cacheMetrics.totalQueries - 1) + duration) /
  cacheMetrics.totalQueries;

  if (duration > 1000) {
  // Log slow operations
  console.log(`Slow cache operation: ${operation} took ${duration}ms`);
  }
  }
  };

/\*\*

- Initialize cache management system
  \*/
  const initializeCacheManager = () => {
  console.log('Initializing intelligent cache management system...');

// Set up periodic cleanup
setInterval(
async () => {
await intelligentCacheCleanup();
},
CACHE\_CONFIG.cleanupIntervalHours \* 60 \* 60 \* 1000,
);

// Set up periodic memory cache cleanup
setInterval(
() => {
cleanMemoryCache();
},
5 \* 60 \* 1000,
); // Every 5 minutes

console.log('Cache management system initialized');
};

export {
intelligentCacheLookup,
smartCacheStore,
calculateAdaptiveTtl,
warmRelatedQueries,
intelligentCacheCleanup,
getCacheAnalytics,
resetCacheMetrics,
initializeCacheManager,
CACHE\_CONFIG,
cacheMetrics,
};
