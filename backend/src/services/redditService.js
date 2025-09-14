import fetch from 'node-fetch';

const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID;
const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET;

let accessToken = null;
let tokenExpiry = null;

const getAccessToken = async () => {
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return accessToken;
  }

  try {
    const auth = Buffer.from(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`).toString('base64');

    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Underfoot/1.0 (Travel Discovery Bot)',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error(`Reddit auth failed: ${response.statusText}`);
    }

    const data = await response.json();
    accessToken = data.access_token;
    tokenExpiry = Date.now() + data.expires_in * 1000 - 60000; // 1 min buffer

    return accessToken;
  } catch (error) {
    console.error('Reddit authentication error:', error);
    return null;
  }
};

const searchRedditRSS = async (location, theme = '') => {
  try {
    const locationSearch = location
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '+');
    const subreddits = [
      locationSearch,
      `${locationSearch}travel`,
      `${locationSearch}locals`,
      'travel',
      'solotravel',
      'backpacking',
      'roadtrip',
    ];

    const results = [];

    for (const subreddit of subreddits.slice(0, 3)) {
      try {
        const rssUrl = `https://www.reddit.com/r/${subreddit}.rss?limit=10`;
        const response = await fetch(rssUrl, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Underfoot/1.0 (Travel Discovery Bot)',
          },
        });

        if (response.ok) {
          const rssText = await response.text();
          const posts = parseRedditRSS(rssText, location, theme);
          results.push(...posts);
        }
      } catch (error) {
        console.warn(`RSS fetch failed for r/${subreddit}:`, error.message);
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return {
      results: deduplicateRedditResults(results),
      metadata: {
        source: 'reddit_rss',
        location,
        theme,
        subredditsChecked: subreddits.slice(0, 3),
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Reddit RSS search error:', error);
    return {
      results: [],
      metadata: {
        source: 'reddit_rss',
        error: error.message,
        location,
        theme,
        timestamp: new Date().toISOString(),
      },
    };
  }
};

const searchRedditAPI = async (location, theme = '') => {
  const token = await getAccessToken();
  if (!token) {
    return { results: [], metadata: { source: 'reddit_api', error: 'No access token' } };
  }

  try {
    const query = `${location} ${theme} hidden gems OR locals OR underground OR offbeat`.trim();
    const searchUrl = `https://oauth.reddit.com/search?q=${encodeURIComponent(query)}&sort=relevance&limit=20&type=link`;

    const response = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'Underfoot/1.0 (Travel Discovery Bot)',
      },
      timeout: 15000,
    });

    if (!response.ok) {
      throw new Error(`Reddit API error: ${response.statusText}`);
    }

    const data = await response.json();
    const posts = (data.data?.children || []).map((child) => {
      const post = child.data;
      return {
        name: post.title,
        description: post.selftext || post.url,
        url: `https://reddit.com${post.permalink}`,
        domain: 'reddit.com',
        subreddit: post.subreddit,
        score: post.score,
        comments: post.num_comments,
        created: new Date(post.created_utc * 1000).toISOString(),
        features: {
          recencyHours: Math.floor((Date.now() - post.created_utc * 1000) / (1000 * 60 * 60)),
          undergroundKeywordHits: countUndergroundKeywords(
            post.title + ' ' + (post.selftext || ''),
          ),
          indieDomain: 1,
          imagePresent: post.thumbnail && post.thumbnail !== 'self' ? 1 : 0,
          estReadingMinutes: estimateReadingTime(post.selftext || post.title),
        },
        source: 'reddit_api',
        source_id: `reddit_${post.id}`,
        cached_at: new Date().toISOString(),
      };
    });

    return {
      results: posts,
      metadata: {
        source: 'reddit_api',
        query,
        location,
        theme,
        totalPosts: data.data?.children?.length || 0,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Reddit API search error:', error);
    return {
      results: [],
      metadata: {
        source: 'reddit_api',
        error: error.message,
        location,
        theme,
        timestamp: new Date().toISOString(),
      },
    };
  }
};

const parseRedditRSS = (rssText, location, theme) => {
  const posts = [];

  try {
    const titleMatches = [...rssText.matchAll(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g)];
    const linkMatches = [...rssText.matchAll(/<link>(.*?)<\/link>/g)];
    const descMatches = [...rssText.matchAll(/<description><!\[CDATA\[(.*?)\]\]><\/description>/g)];
    const dateMatches = [...rssText.matchAll(/<pubDate>(.*?)<\/pubDate>/g)];

    for (let i = 1; i < Math.min(titleMatches.length, linkMatches.length); i++) {
      const title = titleMatches[i][1];
      const url = linkMatches[i][1];
      const description = descMatches[i] ? descMatches[i][1] : '';
      const pubDate = dateMatches[i] ? dateMatches[i][1] : '';

      if (isRelevantToLocation(title + ' ' + description, location, theme)) {
        posts.push({
          name: title,
          description: description.replace(/<[^>]*>/g, '').substring(0, 200),
          url: url,
          domain: 'reddit.com',
          published: pubDate,
          features: {
            recencyHours: calculateRecencyFromPubDate(pubDate),
            undergroundKeywordHits: countUndergroundKeywords(title + ' ' + description),
            indieDomain: 1,
            imagePresent: 0,
            estReadingMinutes: estimateReadingTime(description),
          },
          source: 'reddit_rss',
          source_id: `rss_${url.split('/').pop()}`,
          cached_at: new Date().toISOString(),
        });
      }
    }
  } catch (error) {
    console.error('RSS parsing error:', error);
  }

  return posts;
};

const isRelevantToLocation = (text, location, theme) => {
  const lowerText = text.toLowerCase();
  const lowerLocation = location.toLowerCase();
  const lowerTheme = theme.toLowerCase();

  const locationWords = lowerLocation.split(/\s+/);
  const hasLocationMatch = locationWords.some(
    (word) => word.length > 2 && lowerText.includes(word),
  );

  const hasThemeMatch = !theme || lowerText.includes(lowerTheme);
  const hasUndergroundKeywords = countUndergroundKeywords(text) > 0;

  return hasLocationMatch || hasThemeMatch || hasUndergroundKeywords;
};

const calculateRecencyFromPubDate = (pubDateStr) => {
  try {
    const pubDate = new Date(pubDateStr);
    return Math.floor((Date.now() - pubDate.getTime()) / (1000 * 60 * 60));
  } catch {
    return 168; // Default to 1 week
  }
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
    'underrated',
    'unknown',
    'tucked away',
  ];

  const lowerText = text.toLowerCase();
  return keywords.reduce((count, keyword) => {
    return count + (lowerText.includes(keyword) ? 1 : 0);
  }, 0);
};

const estimateReadingTime = (text) => {
  const wordsPerMinute = 200;
  const wordCount = (text || '').split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
};

const deduplicateRedditResults = (results) => {
  const seen = new Set();
  return results.filter((result) => {
    const key = result.url;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

export { searchRedditRSS, searchRedditAPI, getAccessToken };
