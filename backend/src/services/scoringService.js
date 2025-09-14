const SCORING_WEIGHTS = {
  relevance: 0.5,
  distance: 0.2,
  appFit: 0.3,
};

const calculateStonewalkerStars = (item, searchContext = {}) => {
  const relevance = calculateRelevance(item, searchContext);
  const distance = calculateDistanceComponent(item, searchContext);
  const appFit = calculateAppFit(item);

  const rawScore =
    SCORING_WEIGHTS.relevance * relevance +
    SCORING_WEIGHTS.distance * distance +
    SCORING_WEIGHTS.appFit * appFit;

  const clampedScore = Math.max(0, Math.min(1, rawScore));

  return {
    score: clampedScore,
    factors: {
      relevance,
      distance,
      appFit,
      breakdown: {
        relevanceContribution: SCORING_WEIGHTS.relevance * relevance,
        distanceContribution: SCORING_WEIGHTS.distance * distance,
        appFitContribution: SCORING_WEIGHTS.appFit * appFit,
      },
    },
  };
};

const calculateRelevance = (item, searchContext) => {
  const { intent = '', location = '' } = searchContext;
  const text = `${item.name || ''} ${item.description || ''}`.toLowerCase();
  const intentLower = intent.toLowerCase();
  const locationLower = location.toLowerCase();

  let relevanceScore = 0;

  if (intentLower) {
    const intentWords = intentLower.split(/\s+/).filter((word) => word.length > 2);
    const intentMatches = intentWords.filter((word) => text.includes(word));
    relevanceScore += (intentMatches.length / Math.max(intentWords.length, 1)) * 0.6;
  }

  if (locationLower) {
    const locationWords = locationLower.split(/\s+/).filter((word) => word.length > 2);
    const locationMatches = locationWords.filter((word) => text.includes(word));
    relevanceScore += (locationMatches.length / Math.max(locationWords.length, 1)) * 0.4;
  }

  const undergroundKeywords = item.features?.undergroundKeywordHits || 0;
  relevanceScore += Math.min(undergroundKeywords / 3, 0.3);

  if (item.source === 'reddit_api' || item.source === 'reddit_rss') {
    relevanceScore += 0.1;
  }

  return Math.min(relevanceScore, 1.0);
};

const calculateDistanceComponent = (item, searchContext) => {
  if (!item.distanceMi && !item.coordinates) {
    return 0.5;
  }

  let distance = item.distanceMi;

  if (!distance && item.coordinates && searchContext.coordinates) {
    distance = calculateHaversineDistance(searchContext.coordinates, item.coordinates);
  }

  if (distance === undefined || distance === null) {
    return 0.5;
  }

  if (distance <= 5) {
    return 1.0;
  }
  if (distance <= 15) {
    return 0.7;
  }
  if (distance <= 35) {
    return 0.4;
  }
  return 0.15;
};

const calculateAppFit = (item) => {
  const name = (item.name || '').toLowerCase();
  const description = (item.description || '').toLowerCase();
  const domain = (item.domain || '').toLowerCase();
  const text = `${name} ${description}`;

  const highFitKeywords = [
    'museum',
    'gallery',
    'park',
    'historic',
    'landmark',
    'tour',
    'attraction',
    'festival',
    'event',
    'market',
    'cafe',
    'restaurant',
    'bar',
    'brewery',
    'distillery',
    'winery',
    'trail',
    'hike',
    'adventure',
    'experience',
    'art',
    'music',
    'theater',
    'performance',
    'culture',
    'local',
    'unique',
  ];

  const lowFitKeywords = [
    'funeral',
    'hospital',
    'clinic',
    'medical',
    'office',
    'corporate',
    'insurance',
    'bank',
    'finance',
    'legal',
    'law',
    'adult',
    'explicit',
    'logistics',
    'warehouse',
    'industrial',
    'utility',
    'government',
    'police',
    'fire',
    'emergency',
    'private',
    'restricted',
  ];

  const mediumFitKeywords = ['cemetery', 'graveyard', 'memorial'];

  const hasHighFit = highFitKeywords.some((keyword) => text.includes(keyword));
  const hasLowFit = lowFitKeywords.some((keyword) => text.includes(keyword));
  const hasMediumFit = mediumFitKeywords.some((keyword) => text.includes(keyword));

  if (hasLowFit) {
    return 0.1;
  }

  if (hasHighFit) {
    return 0.9;
  }

  if (hasMediumFit) {
    const isHistoric = text.includes('historic') || text.includes('tour');
    return isHistoric ? 0.6 : 0.3;
  }

  if (item.features?.indieDomain) {
    return 0.7;
  }

  if (domain.includes('reddit') || domain.includes('blog')) {
    return 0.6;
  }

  if (domain.includes('eventbrite') || item.source === 'eventbrite') {
    return 0.8;
  }

  return 0.5;
};

const calculateHaversineDistance = (coord1, coord2) => {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(coord2.lat - coord1.lat);
  const dLon = toRadians(coord2.lng - coord1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.lat)) *
      Math.cos(toRadians(coord2.lat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRadians = (degrees) => degrees * (Math.PI / 180);

const scoreAndRankResults = (results, searchContext = {}) => {
  const scoredResults = results.map((item) => {
    const scoring = calculateStonewalkerStars(item, searchContext);
    return {
      ...item,
      stonewalker_stars: Math.round(scoring.score * 5 * 10) / 10,
      confidence: scoring.score,
      scoring_factors: scoring.factors,
    };
  });

  const filteredResults = scoredResults.filter((item) => item.confidence > 0);

  return filteredResults.sort((a, b) => b.confidence - a.confidence);
};

const categorizeResults = (results, radiusCore = 15) => {
  const primary = [];
  const nearby = [];

  for (const result of results) {
    const distance = result.distanceMi || 0;

    if (distance <= radiusCore) {
      primary.push(result);
    } else {
      nearby.push({
        ...result,
        name: `${result.name} (≈${Math.round(distance)} mi)`,
      });
    }
  }

  const maxPrimary = 5;
  const maxNearby = 2;

  if (primary.length < 3 && nearby.length > 0) {
    const needed = Math.min(3 - primary.length, nearby.length);
    const promoted = nearby.splice(0, needed);
    primary.push(...promoted);
  }

  return {
    primary: primary.slice(0, maxPrimary),
    nearby: nearby.slice(0, maxNearby),
  };
};

const generateScoringSummary = (results) => {
  if (results.length === 0) {
    return {
      totalResults: 0,
      averageScore: 0,
      scoreDistribution: {},
      topScoringFactors: [],
    };
  }

  const scores = results.map((r) => r.confidence || 0);
  const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

  const scoreRanges = {
    excellent: scores.filter((s) => s >= 0.8).length,
    good: scores.filter((s) => s >= 0.6 && s < 0.8).length,
    fair: scores.filter((s) => s >= 0.4 && s < 0.6).length,
    poor: scores.filter((s) => s < 0.4).length,
  };

  const factorAverages = {
    relevance: 0,
    distance: 0,
    appFit: 0,
  };

  results.forEach((result) => {
    if (result.scoring_factors) {
      factorAverages.relevance += result.scoring_factors.relevance || 0;
      factorAverages.distance += result.scoring_factors.distance || 0;
      factorAverages.appFit += result.scoring_factors.appFit || 0;
    }
  });

  Object.keys(factorAverages).forEach((key) => {
    factorAverages[key] /= results.length;
  });

  return {
    totalResults: results.length,
    averageScore: Math.round(averageScore * 100) / 100,
    scoreDistribution: scoreRanges,
    averageFactors: factorAverages,
  };
};

export {
  calculateStonewalkerStars,
  scoreAndRankResults,
  categorizeResults,
  generateScoringSummary,
  calculateRelevance,
  calculateDistanceComponent,
  calculateAppFit,
  SCORING_WEIGHTS,
};
