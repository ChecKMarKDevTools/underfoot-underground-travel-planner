import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
const supabaseAdmin =
  supabaseServiceKey && supabaseUrl ? createClient(supabaseUrl, supabaseServiceKey) : null;

// Initialize OpenAI client for embeddings
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// Vector search configuration
const VECTOR_CONFIG = {
  embeddingModel: 'text-embedding-ada-002',
  embeddingDimensions: 1536,
  similarityThreshold: 0.85,
  cacheTtlMinutes: 30,
  maxCacheResults: 5,
};

const generateCacheKey = (query, location) => {
  const normalized = `${query.trim().toLowerCase()}|${location.trim().toLowerCase()}`;
  return btoa(normalized).replace(/[+=]/g, '').substring(0, 32);
};

const getCachedSearchResults = async (query, location) => {
  if (!supabase) {
    return null;
  }

  try {
    const queryHash = generateCacheKey(query, location);
    const { data, error } = await supabase
      .from('search_results')
      .select('*')
      .eq('query_hash', queryHash)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Cache read error:', error);
      return null;
    }

    return data ? JSON.parse(data.results_json) : null;
  } catch (err) {
    console.error('Cache read exception:', err);
    return null;
  }
};

const setCachedSearchResults = async (query, location, results, ttlMinutes = 30) => {
  if (!supabase) {
    return false;
  }

  try {
    const queryHash = generateCacheKey(query, location);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();

    const { error } = await supabase.from('search_results').upsert(
      {
        query_hash: queryHash,
        location: location.trim(),
        intent: query.trim(),
        results_json: JSON.stringify(results),
        expires_at: expiresAt,
      },
      {
        onConflict: 'query_hash',
      },
    );

    if (error) {
      console.error('Cache write error:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Cache write exception:', err);
    return false;
  }
};

const getCachedLocation = async (rawInput) => {
  if (!supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('location_cache')
      .select('*')
      .eq('raw_input', rawInput.trim().toLowerCase())
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Location cache read error:', error);
      return null;
    }

    return data
      ? {
          normalized: data.normalized_location,
          confidence: data.confidence,
          rawCandidates: data.raw_candidates || [],
        }
      : null;
  } catch (err) {
    console.error('Location cache read exception:', err);
    return null;
  }
};

const setCachedLocation = async (
  rawInput,
  normalized,
  confidence,
  rawCandidates = [],
  ttlHours = 24,
) => {
  if (!supabase) {
    return false;
  }

  try {
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();

    const { error } = await supabase.from('location_cache').upsert(
      {
        raw_input: rawInput.trim().toLowerCase(),
        normalized_location: normalized,
        confidence: confidence,
        raw_candidates: rawCandidates,
        expires_at: expiresAt,
      },
      {
        onConflict: 'raw_input',
      },
    );

    if (error) {
      console.error('Location cache write error:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Location cache write exception:', err);
    return false;
  }
};

const cleanExpiredCache = async () => {
  if (!supabaseAdmin) {
    return false;
  }

  try {
    const { error } = await supabaseAdmin.rpc('clean_expired_cache');

    if (error) {
      console.error('Cache cleanup error:', error);
      return false;
    }

    console.log('Cache cleanup completed successfully');
    return true;
  } catch (err) {
    console.error('Cache cleanup exception:', err);
    return false;
  }
};

const getCacheStats = async () => {
  if (!supabase) {
    return {
      searchResults: 0,
      locationCache: 0,
      connected: false,
    };
  }

  try {
    const [searchCount, locationCount] = await Promise.all([
      supabase.from('search_results').select('id', { count: 'exact', head: true }),
      supabase.from('location_cache').select('id', { count: 'exact', head: true }),
    ]);

    return {
      searchResults: searchCount.count || 0,
      locationCache: locationCount.count || 0,
      connected: true,
    };
  } catch (err) {
    console.error('Cache stats error:', err);
    return {
      searchResults: 0,
      locationCache: 0,
      connected: false,
    };
  }
};

// ============================================================================
// VECTOR SEARCH FUNCTIONS
// ============================================================================

/**
 * Generate embeddings using OpenAI API
 */
const generateEmbedding = async (text) => {
  if (!openai) {
    console.warn('OpenAI client not initialized - using fallback cache strategy');
    return null;
  }

  try {
    const response = await openai.embeddings.create({
      model: VECTOR_CONFIG.embeddingModel,
      input: text.trim(),
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('OpenAI embedding error:', error);
    return null;
  }
};

/**
 * Find similar cached results using vector similarity
 */
const findSimilarCachedResults = async (query, location, similarityThreshold = VECTOR_CONFIG.similarityThreshold) => {
  try {
    const [queryEmbedding, locationEmbedding] = await Promise.all([
      generateEmbedding(query),
      generateEmbedding(location)
    ]);

    if (!queryEmbedding || !locationEmbedding) {
      console.log('Falling back to traditional cache lookup');
      return await getCachedSearchResults(query, location);
    }

    const { data, error } = await supabase
      .rpc('find_similar_cached_query', {
        input_query_embedding: queryEmbedding,
        input_location_embedding: locationEmbedding,
        similarity_threshold: similarityThreshold,
        result_limit: VECTOR_CONFIG.maxCacheResults
      });

    if (error) {
      console.error('Vector similarity search error:', error);
      return null;
    }

    if (data && data.length > 0) {
      const bestMatch = data[0];
      console.log(`Vector cache hit: ${bestMatch.combined_similarity.toFixed(3)} similarity`);
      
      // Update access count for cache analytics
      await supabase.rpc('update_cache_access', { cache_id: bestMatch.id });
      
      return bestMatch.cached_results;
    }

    return null;
  } catch (error) {
    console.error('Vector search exception:', error);
    return null;
  }
};

/**
 * Store search results with vector embeddings in semantic cache
 */
const setSemanticCachedResults = async (query, location, results, ttlMinutes = VECTOR_CONFIG.cacheTtlMinutes) => {
  try {
    const [queryEmbedding, locationEmbedding] = await Promise.all([
      generateEmbedding(query),
      generateEmbedding(location)
    ]);

    if (!queryEmbedding || !locationEmbedding) {
      console.log('Falling back to traditional cache storage');
      return await setCachedSearchResults(query, location, results, ttlMinutes);
    }

    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();

    const { error } = await supabase.from('semantic_cache').insert({
      original_query: query.trim(),
      normalized_query: query.trim().toLowerCase(),
      query_embedding: queryEmbedding,
      location: location.trim(),
      location_embedding: locationEmbedding,
      cached_results: results,
      similarity_threshold: VECTOR_CONFIG.similarityThreshold,
      expires_at: expiresAt,
    });

    if (error) {
      console.error('Semantic cache write error:', error);
      return false;
    }

    // Also store in traditional cache for backup
    await setCachedSearchResults(query, location, results, ttlMinutes);
    
    return true;
  } catch (error) {
    console.error('Semantic cache write exception:', error);
    return false;
  }
};

/**
 * Find relevant underground keywords for query enhancement
 */
const findUndergroundKeywords = async (query, similarityThreshold = 0.75) => {
  try {
    const queryEmbedding = await generateEmbedding(query);
    
    if (!queryEmbedding) {
      return [];
    }

    const { data, error } = await supabase
      .rpc('find_underground_keywords', {
        query_embedding: queryEmbedding,
        similarity_threshold: similarityThreshold,
        result_limit: 10
      });

    if (error) {
      console.error('Underground keywords search error:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Underground keywords search exception:', error);
    return [];
  }
};

/**
 * Enhanced search with vector similarity and keyword enrichment
 */
const enhancedSearchWithVectors = async (query, location) => {
  try {
    // First, try to find similar cached results
    const cachedResult = await findSimilarCachedResults(query, location);
    if (cachedResult) {
      return {
        cached: true,
        source: 'vector_cache',
        results: cachedResult
      };
    }

    // If no cached results, find relevant underground keywords for context
    const relevantKeywords = await findUndergroundKeywords(query);
    
    return {
      cached: false,
      relevantKeywords: relevantKeywords,
      enhancedQuery: query,
      location: location
    };
  } catch (error) {
    console.error('Enhanced search exception:', error);
    return {
      cached: false,
      relevantKeywords: [],
      enhancedQuery: query,
      location: location
    };
  }
};

/**
 * Populate keyword embeddings (for initial setup)
 */
const populateKeywordEmbeddings = async () => {
  if (!supabaseAdmin) {
    console.error('Service role required for keyword embedding population');
    return false;
  }

  try {
    // Get all keywords without embeddings
    const { data: keywords, error } = await supabaseAdmin
      .from('underground_keywords')
      .select('id, keyword')
      .is('embedding', null);

    if (error) {
      console.error('Error fetching keywords:', error);
      return false;
    }

    if (!keywords || keywords.length === 0) {
      console.log('All keywords already have embeddings');
      return true;
    }

    console.log(`Generating embeddings for ${keywords.length} keywords...`);
    
    // Process in batches to avoid rate limits
    const batchSize = 10;
    let processedCount = 0;

    for (let i = 0; i < keywords.length; i += batchSize) {
      const batch = keywords.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (keyword) => {
          const embedding = await generateEmbedding(keyword.keyword);
          if (embedding) {
            await supabaseAdmin
              .from('underground_keywords')
              .update({ 
                embedding: embedding,
                updated_at: new Date().toISOString()
              })
              .eq('id', keyword.id);
            processedCount++;
          }
        })
      );

      // Add delay between batches to respect rate limits
      if (i + batchSize < keywords.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`Successfully generated embeddings for ${processedCount} keywords`);
    return true;
  } catch (error) {
    console.error('Keyword embedding population error:', error);
    return false;
  }
};

export {
  supabase,
  supabaseAdmin,
  getCachedSearchResults,
  setCachedSearchResults,
  getCachedLocation,
  setCachedLocation,
  cleanExpiredCache,
  getCacheStats,
  generateCacheKey,
  // Vector search functions
  generateEmbedding,
  findSimilarCachedResults,
  setSemanticCachedResults,
  findUndergroundKeywords,
  enhancedSearchWithVectors,
  populateKeywordEmbeddings,
  VECTOR_CONFIG,
};
