import express from 'express';
import { randomUUID } from 'crypto';
import OpenAI from 'openai';
import fetch from 'node-fetch';
import {
  getCachedSearchResults,
  getCachedLocation,
  setCachedLocation,
  enhancedSearchWithVectors,
  findUndergroundKeywords,
  populateKeywordEmbeddings,
} from '../services/supabaseService.js';
import {
  intelligentCacheLookup,
  smartCacheStore,
  getCacheAnalytics,
  resetCacheMetrics,
  intelligentCacheCleanup,
} from '../services/cacheManagerService.js';
import { searchHiddenGems } from '../services/serpService.js';
import { searchRedditRSS } from '../services/redditService.js';
import { searchLocalEvents } from '../services/eventService.js';
import {
  scoreAndRankResults,
  categorizeResults,
  generateScoringSummary,
} from '../services/scoringService.js';

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.post('/search', async (req, res) => {
  const started = Date.now();
  const requestId = 'search_' + randomUUID();

  try {
    const { chatInput, force = false } = req.body;

    if (!chatInput || typeof chatInput !== 'string' || !chatInput.trim()) {
      return res.status(400).json({
        error: 'chatInput must be a non-empty string',
        debug: { requestId },
      });
    }

    console.log(
      JSON.stringify({
        evt: 'search.start',
        requestId,
        input: chatInput.substring(0, 100),
      }),
    );

    if (!force) {
      const vectorCacheResult = await intelligentCacheLookup(chatInput, '');
      if (vectorCacheResult.cached) {
        console.log(
          JSON.stringify({
            evt: 'search.vector_cache_hit',
            requestId,
            source: vectorCacheResult.source,
            similarity: vectorCacheResult.similarity,
            elapsedMs: Date.now() - started,
          }),
        );

        return res.json({
          ...vectorCacheResult.results,
          debug: {
            ...(vectorCacheResult.results.debug || {}),
            cache: `${vectorCacheResult.source}_hit`,
            similarity: vectorCacheResult.similarity,
            requestId,
            executionTimeMs: Date.now() - started,
          },
        });
      }

      // Fallback to traditional cache if vector search didn't find anything
      const cached = await getCachedSearchResults(chatInput, '');
      if (cached) {
        console.log(
          JSON.stringify({
            evt: 'search.traditional_cache_hit',
            requestId,
            elapsedMs: Date.now() - started,
          }),
        );

        return res.json({
          ...cached,
          debug: {
            ...(cached.debug || {}),
            cache: 'traditional_hit',
            requestId,
            executionTimeMs: Date.now() - started,
          },
        });
      }
    }

    const parsed = await parseUserInput(chatInput);
    if (!parsed.location || !parsed.intent) {
      return res.status(400).json({
        error: 'Unable to parse location and intent from input',
        debug: { requestId, parsed, input: chatInput },
      });
    }

    const normalizedLocation = await normalizeLocation(parsed.location);
    const searchContext = {
      location: normalizedLocation.normalized,
      intent: parsed.intent,
      coordinates: normalizedLocation.coordinates,
      confidence: normalizedLocation.confidence,
    };

    const dataSourceStarted = Date.now();
    const results = await Promise.allSettled([
      searchHiddenGems(searchContext.location, parsed.intent),
      searchRedditRSS(searchContext.location, parsed.intent),
      searchLocalEvents(searchContext.location, [parsed.intent]),
    ]);

    const allResults = [];
    const sourceStats = {};

    results.forEach((result, index) => {
      const sourceName = ['serpapi', 'reddit', 'eventbrite'][index];
      if (result.status === 'fulfilled') {
        allResults.push(...result.value.results);
        sourceStats[sourceName] = {
          count: result.value.results.length,
          status: 'success',
        };
      } else {
        console.error(`${sourceName} failed:`, result.reason);
        sourceStats[sourceName] = {
          count: 0,
          status: 'failed',
          error: result.reason?.message,
        };
      }
    });

    const scoredResults = scoreAndRankResults(allResults, searchContext);
    const categorized = categorizeResults(scoredResults);
    const summary = generateScoringSummary(scoredResults);

    const response = await generateStonewalkerResponse(
      parsed.intent,
      searchContext.location,
      categorized,
      summary,
    );

    // Get underground keywords for query enhancement
    const undergroundKeywords = await findUndergroundKeywords(parsed.intent);

    const finalResult = {
      user_intent: parsed.intent,
      user_location: searchContext.location,
      response: response,
      places: [...categorized.primary, ...categorized.nearby],
      debug: {
        requestId,
        executionTimeMs: Date.now() - started,
        dataSourceMs: Date.now() - dataSourceStarted,
        parsed,
        normalizedLocation,
        sourceStats,
        scoringSummary: summary,
        cacheStatus: 'miss',
        undergroundKeywords: undergroundKeywords.slice(0, 5), // Include top 5 relevant keywords
      },
    };

    // Store using intelligent caching with vector embeddings
    await smartCacheStore(chatInput, searchContext.location, finalResult, 30);

    console.log(
      JSON.stringify({
        evt: 'search.complete',
        requestId,
        elapsedMs: Date.now() - started,
        resultCount: finalResult.places.length,
        primaryCount: categorized.primary.length,
        nearbyCount: categorized.nearby.length,
        keywordMatches: undergroundKeywords.length,
      }),
    );

    res.json(finalResult);
  } catch (error) {
    console.error('Search orchestration error:', error);
    res.status(500).json({
      error: 'Internal search error',
      debug: {
        requestId,
        executionTimeMs: Date.now() - started,
        errorMessage: error.message,
      },
    });
  }
});

const parseUserInput = async (input) => {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      max_tokens: 200,
      messages: [
        {
          role: 'system',
          content: `Parse travel queries into location and intent. Return JSON with "location" and "intent" fields.

Examples:
"hidden gems in Pikeville KY" -> {"location": "Pikeville, KY", "intent": "hidden gems"}
"cool underground spots near Atlanta" -> {"location": "Atlanta, GA", "intent": "underground spots"}
"weird stuff to do in Portland Oregon" -> {"location": "Portland, OR", "intent": "weird stuff"}

Extract the most specific location and the clearest intent description.`,
        },
        {
          role: 'user',
          content: input,
        },
      ],
    });

    const result = JSON.parse(completion.choices[0].message.content);
    return {
      location: result.location || '',
      intent: result.intent || '',
      confidence: 0.8, // TODO: why is this here
    };
  } catch (error) {
    console.error('OpenAI parsing error:', error);
    return parseInputHeuristically(input);
  }
};

const parseInputHeuristically = (input) => {
  const text = input.toLowerCase();

  const locationPatterns = [
    /in\s+([^,]+,?\s*[a-z]{2})/i,
    /near\s+([^,]+)/i,
    /([^,]+,\s*[a-z]{2})/i,
    /([a-z\s]+(?:city|town|ville|burg|port))/i,
  ];

  let location = '';
  for (const pattern of locationPatterns) {
    const match = input.match(pattern);
    if (match) {
      location = match[1].trim();
      break;
    }
  }

  const intentKeywords = [
    'hidden gems',
    'underground',
    'secret spots',
    'locals only',
    'offbeat',
    'weird',
    'strange',
    'unique',
    'quirky',
    'dive bars',
    'hole in the wall',
    'authentic',
    'indie',
    'alternative',
  ];

  let intent = 'hidden gems';
  for (const keyword of intentKeywords) {
    if (text.includes(keyword)) {
      intent = keyword;
      break;
    }
  }

  return {
    location: location || 'unknown',
    intent,
    confidence: location ? 0.6 : 0.3,
  };
};

const normalizeLocation = async (rawLocation) => {
  const cached = await getCachedLocation(rawLocation);
  if (cached) {
    return {
      normalized: cached.normalized,
      confidence: cached.confidence,
      coordinates: cached.coordinates || null,
    };
  }

  try {
    const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(rawLocation)}&limit=1&apiKey=${process.env.GEOAPIFY_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.features && data.features.length > 0) {
      const feature = data.features[0];
      const props = feature.properties;

      const normalized = [
        props.city || props.town || props.village,
        props.state || props.region,
        props.country,
      ]
        .filter(Boolean)
        .join(', ');

      const result = {
        normalized,
        confidence: props.rank?.confidence || 0.8,
        coordinates: {
          lat: props.lat,
          lng: props.lon,
        },
      };

      await setCachedLocation(rawLocation, result.normalized, result.confidence, [feature]);
      return result;
    }
  } catch (error) {
    console.error('Geoapify error:', error);
  }

  const fallback = {
    normalized: rawLocation,
    confidence: 0.5,
    coordinates: null,
  };

  await setCachedLocation(rawLocation, fallback.normalized, fallback.confidence);
  return fallback;
};

const generateStonewalkerResponse = async (intent, location, categorized, summary) => {
  try {
    const places = [...categorized.primary, ...categorized.nearby];
    const placesText = places
      .map((p) => `• ${p.name}: ${p.description.substring(0, 100)}`)
      .join('\n');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.4,
      max_tokens: 300,
      messages: [
        {
          role: 'system',
          content: `You are Stonewalker, a mystical and concise travel guide who uncovers hidden places.

Respond with wisdom and brevity in 2-3 sentences. Be helpful but never overly enthusiastic.
Reference the specific places found and give practical advice.

Style: Mystical, wise, slightly mysterious, but practical and helpful.`,
        },
        {
          role: 'user',
          content: `User seeks: ${intent} in ${location}

Found places:
${placesText}

Scoring summary: ${summary.totalResults} results, average score ${summary.averageScore}/1.0

Write a brief Stonewalker response.`,
        },
      ],
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI response generation error:', error);
    return generateFallbackResponse(intent, location, categorized);
  }
};

const generateFallbackResponse = (intent, location, categorized) => {
  const totalPlaces = categorized.primary.length + categorized.nearby.length;

  if (totalPlaces === 0) {
    return `The paths around ${location} remain elusive for ${intent}. Perhaps broaden your search or try a different approach—sometimes the best discoveries lie in unexpected directions.`;
  }

  if (categorized.primary.length >= 3) {
    return `${location} reveals ${categorized.primary.length} intriguing spots for ${intent}. These places whisper of authentic experiences—venture forth with curiosity and an open mind.`;
  }

  return `${location} offers ${totalPlaces} discoveries for ${intent}. Some paths lead nearby, others require a short journey—but each promises something beyond the ordinary tourist trail.`;
};

// ============================================================================
// ADMIN ROUTES FOR VECTOR SEARCH AND CACHE MANAGEMENT
// ============================================================================

// Cache analytics endpoint
router.get('/cache/analytics', async (req, res) => {
  try {
    const analytics = await getCacheAnalytics();
    res.json(analytics);
  } catch (error) {
    console.error('Cache analytics error:', error);
    res.status(500).json({ error: 'Failed to get cache analytics' });
  }
});

// Manual cache cleanup endpoint
router.post('/cache/cleanup', async (req, res) => {
  try {
    const result = await intelligentCacheCleanup();
    res.json(result);
  } catch (error) {
    console.error('Cache cleanup error:', error);
    res.status(500).json({ error: 'Failed to cleanup cache' });
  }
});

// Reset cache metrics endpoint
router.post('/cache/reset-metrics', async (req, res) => {
  try {
    resetCacheMetrics();
    res.json({ success: true, message: 'Cache metrics reset' });
  } catch (error) {
    console.error('Reset metrics error:', error);
    res.status(500).json({ error: 'Failed to reset metrics' });
  }
});

// Populate keyword embeddings endpoint (one-time setup)
router.post('/admin/populate-embeddings', async (req, res) => {
  try {
    const result = await populateKeywordEmbeddings();
    res.json({
      success: result,
      message: result ? 'Keywords populated successfully' : 'Failed to populate keywords'
    });
  } catch (error) {
    console.error('Populate embeddings error:', error);
    res.status(500).json({ error: 'Failed to populate embeddings' });
  }
});

// Test vector search endpoint
router.post('/vector/test', async (req, res) => {
  try {
    const { query, location } = req.body;

    if (!query || !location) {
      return res.status(400).json({ error: 'Query and location are required' });
    }

    const vectorResult = await enhancedSearchWithVectors(query, location);
    const keywords = await findUndergroundKeywords(query);

    res.json({
      query,
      location,
      vectorResult,
      relevantKeywords: keywords.slice(0, 10),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Vector test error:', error);
    res.status(500).json({ error: 'Vector search test failed' });
  }
});

export default router;
