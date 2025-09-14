import fetch from 'node-fetch';

const EVENTBRITE_TOKEN = process.env.EVENTBRITE_TOKEN;
const BASE_URL = 'https://www.eventbriteapi.com/v3';

const searchEvents = async (location, theme = '', options = {}) => {
  try {
    const searchParams = new URLSearchParams({
      'location.address': location,
      'location.within': options.radius || '25mi',
      'start_date.range_start': options.startDate || new Date().toISOString(),
      'start_date.range_end':
        options.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      sort_by: 'relevance',
      page: '1',
      page_size: options.limit || '20',
      include_all_series_instances: 'false',
    });

    if (theme) {
      searchParams.append('q', theme);
    }

    const url = `${BASE_URL}/events/search/?${searchParams}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${EVENTBRITE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });

    if (!response.ok) {
      throw new Error(`Eventbrite API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    const results = (data.events || []).map((event) => ({
      name: event.name?.text || 'Unnamed Event',
      description: event.description?.text || event.summary || '',
      url: event.url,
      domain: 'eventbrite.com',
      startDate: event.start?.utc,
      endDate: event.end?.utc,
      venue: event.venue_id ? `Venue ID: ${event.venue_id}` : '',
      isOnline: event.online_event || false,
      isFree: event.is_free || false,
      category: event.category?.name || '',
      features: {
        recencyHours: 0, // Events are future-focused
        undergroundKeywordHits: countUndergroundKeywords(
          (event.name?.text || '') + ' ' + (event.description?.text || ''),
        ),
        indieDomain: 1, // Local events are generally "indie"
        imagePresent: event.logo?.url ? 1 : 0,
        estReadingMinutes: estimateReadingTime(event.description?.text || event.summary || ''),
      },
      source: 'eventbrite',
      source_id: `eventbrite_${event.id}`,
      cached_at: new Date().toISOString(),
    }));

    return {
      results,
      metadata: {
        source: 'eventbrite',
        location,
        theme,
        totalEvents: data.pagination?.object_count || 0,
        hasMorePages: data.pagination?.has_more_items || false,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Eventbrite search error:', error);
    return {
      results: [],
      metadata: {
        source: 'eventbrite',
        error: error.message,
        location,
        theme,
        timestamp: new Date().toISOString(),
      },
    };
  }
};

const searchLocalEvents = async (location, themes = ['art', 'music', 'food', 'culture']) => {
  const allResults = [];

  for (const theme of themes) {
    const results = await searchEvents(location, theme, { limit: 5 });
    allResults.push(...results.results);

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return {
    results: deduplicateEvents(allResults),
    metadata: {
      source: 'eventbrite_themed',
      location,
      themes,
      timestamp: new Date().toISOString(),
    },
  };
};

const getVenueDetails = async (venueId) => {
  if (!venueId) {
    return null;
  }

  try {
    const response = await fetch(`${BASE_URL}/venues/${venueId}/`, {
      headers: {
        Authorization: `Bearer ${EVENTBRITE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    if (!response.ok) {
      throw new Error(`Venue fetch error: ${response.statusText}`);
    }

    const venue = await response.json();

    return {
      name: venue.name,
      address: venue.address
        ? [
            venue.address.address_1,
            venue.address.city,
            venue.address.region,
            venue.address.postal_code,
          ]
            .filter(Boolean)
            .join(', ')
        : '',
      latitude: venue.latitude,
      longitude: venue.longitude,
    };
  } catch (error) {
    console.error('Venue details error:', error);
    return null;
  }
};

const filterLocalEvents = (events, location) => {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  return events.filter((event) => {
    const eventStart = new Date(event.startDate);

    const isUpcoming = eventStart >= now && eventStart <= thirtyDaysFromNow;
    const hasLocationRelevance = isRelevantToLocation(
      event.name + ' ' + event.description,
      location,
    );
    const isInteresting =
      event.features.undergroundKeywordHits > 0 ||
      event.category.toLowerCase().includes('art') ||
      event.category.toLowerCase().includes('music') ||
      event.category.toLowerCase().includes('culture');

    return isUpcoming && (hasLocationRelevance || isInteresting);
  });
};

const isRelevantToLocation = (text, location) => {
  const lowerText = text.toLowerCase();
  const lowerLocation = location.toLowerCase();

  const locationWords = lowerLocation.split(/\s+/).filter((word) => word.length > 2);
  return locationWords.some((word) => lowerText.includes(word));
};

const countUndergroundKeywords = (text) => {
  const keywords = [
    'hidden',
    'secret',
    'underground',
    'locals',
    'offbeat',
    'unique',
    'alternative',
    'indie',
    'experimental',
    'avant-garde',
    'emerging',
    'intimate',
    'exclusive',
    'dive',
    'authentic',
    'artisan',
    'craft',
    'local',
    'community',
    'grassroots',
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

const deduplicateEvents = (events) => {
  const seen = new Set();
  return events.filter((event) => {
    const key = `${event.name}|${event.startDate}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const formatEventForDisplay = (event) => {
  const startDate = new Date(event.startDate);
  const dateStr = startDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return {
    ...event,
    displayDate: dateStr,
    displayTime: startDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }),
  };
};

export {
  searchEvents,
  searchLocalEvents,
  getVenueDetails,
  filterLocalEvents,
  formatEventForDisplay,
};
