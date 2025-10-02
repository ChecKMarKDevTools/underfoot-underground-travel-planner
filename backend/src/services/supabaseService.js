import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const supabaseAdmin =
  supabaseServiceKey && supabaseUrl ? createClient(supabaseUrl, supabaseServiceKey) : null;

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
};
