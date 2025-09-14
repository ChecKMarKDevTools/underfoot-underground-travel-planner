import fetch from 'node-fetch';

const SERPAPI_KEY = process.env.SERPAPI_KEY;
const BASE_URL = 'https://serpapi.com/search';

const searchGoogle = async (query, location, options = {}) => {
  try {
    const searchParams = new URLSearchParams({
      engine: 'google',
      q: query,
      location: location,
      api_key: SERPAPI_KEY,
      num: options.limit || 10,
      hl: 'en',
      gl: 'us',
      safe: 'active',
      ...options.extraParams,
    });

    const url = `${BASE_URL}?${searchParams}`;
    const response = await fetch(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Underfoot/1.0 (Travel Discovery Bot)',
      },
    });

    if (!response.ok) {
      throw new Error(`SerpAPI HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`SerpAPI Error: ${data.error}`);
    }

    const results = (data.organic_results || []).map((result) => ({
      name: result.title,
      description: result.snippet || '',
      url: result.link,
      domain: extractDomain(result.link),
      position: result.position,
      features: {
        recencyHours: estimateRecency(result),
        undergroundKeywordHits: countUndergroundKeywords(
          result.title + ' ' + (result.snippet || ''),
        ),
        indieDomain: isIndieDomain(result.link) ? 1 : 0,
        imagePresent: result.thumbnail ? 1 : 0,
        estReadingMinutes: estimateReadingTime(result.snippet || ''),
      },
      source: 'serpapi',
      source_id: `serp_${result.position}_${Date.now()}`,
      cached_at: new Date().toISOString(),
    }));

    return {
      results,
      metadata: {
        source: 'serpapi',
        query,
        location,
        totalResults: data.search_information?.total_results || 0,
        searchTime: data.search_metadata?.processing_time_ms || 0,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('SerpAPI search error:', error);
    return {
      results: [],
      metadata: {
        source: 'serpapi',
        error: error.message,
        query,
        location,
        timestamp: new Date().toISOString(),
      },
    };
  }
};

const searchHiddenGems = async (location, theme = '') => {
  const queries = [
    `hidden gems ${location} ${theme}`.trim(),
    `locals only ${location} ${theme}`.trim(),
    `underground spots ${location} ${theme}`.trim(),
    `offbeat ${location} ${theme}`.trim(),
  ];

  const results = [];

  for (const query of queries.slice(0, 2)) {
    const searchResult = await searchGoogle(query, location, { limit: 5 });
    results.push(...searchResult.results);

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  const uniqueResults = deduplicateResults(results);

  return {
    results: uniqueResults,
    metadata: {
      source: 'serpapi_hidden_gems',
      location,
      theme,
      queriesUsed: queries.slice(0, 2),
      timestamp: new Date().toISOString(),
    },
  };
};

const extractDomain = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

const isIndieDomain = (url) => {
  const domain = extractDomain(url);
  const corporateDomains = [
    'tripadvisor.com',
    'expedia.com',
    'booking.com',
    'hotels.com',
    'kayak.com',
    'priceline.com',
    'orbitz.com',
    'travelocity.com',
    'yelp.com',
    'foursquare.com',
    'facebook.com',
    'instagram.com',
    'wikipedia.org',
    'wikimedia.org',
  ];

  return !corporateDomains.some((corp) => domain.includes(corp));
};

const countUndergroundKeywords = (text) => {
  const keywords = [
    'hidden',
    'secret',
    'underground',
    'locals',
    'offbeat',
    'unique',
    'undiscovered',
    'gem',
    'insider',
    'off the beaten path',
    'lesser known',
    'dive',
    'hole in the wall',
    'authentic',
    'quirky',
    'weird',
    'strange',
  ];

  const lowerText = text.toLowerCase();
  return keywords.reduce((count, keyword) => {
    return count + (lowerText.includes(keyword) ? 1 : 0);
  }, 0);
};

const estimateRecency = (result) => {
  if (result.date) {
    const resultDate = new Date(result.date);
    const hoursDiff = (Date.now() - resultDate.getTime()) / (1000 * 60 * 60);
    return Math.max(0, Math.floor(hoursDiff));
  }
  return 168; // Default to 1 week old
};

const estimateReadingTime = (text) => {
  const wordsPerMinute = 200;
  const wordCount = (text || '').split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
};

const deduplicateResults = (results) => {
  const seen = new Set();
  return results.filter((result) => {
    const key = `${result.url}|${result.name}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

export { searchGoogle, searchHiddenGems, isIndieDomain, countUndergroundKeywords, extractDomain };
