// Google Places API types and utilities
export interface GooglePlace {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types: string[];
  rating?: number;
  photos?: Array<{
    photo_reference: string;
    width: number;
    height: number;
  }>;
  opening_hours?: {
    open_now: boolean;
  };
}

export interface PlacesSearchResponse {
  results: GooglePlace[];
  status: string;
  next_page_token?: string;
}

// Environment variable for API key
const GOOGLE_PLACES_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;

export class GooglePlacesService {
  private static instance: GooglePlacesService;

  static getInstance(): GooglePlacesService {
    if (!GooglePlacesService.instance) {
      GooglePlacesService.instance = new GooglePlacesService();
    }
    return GooglePlacesService.instance;
  }

  async searchPlaces(
    query: string,
    location?: { lat: number; lng: number },
    radius = 50000,
  ): Promise<GooglePlace[]> {
    if (!GOOGLE_PLACES_API_KEY) {
      console.warn(
        'Google Places API key not found. Please set VITE_GOOGLE_PLACES_API_KEY environment variable.',
      );
      return [];
    }

    try {
      const params = new URLSearchParams({
        query,
        key: GOOGLE_PLACES_API_KEY,
      });

      if (location) {
        params.append('location', `${location.lat},${location.lng}`);
        params.append('radius', radius.toString());
      }

      // Note: This will fail due to CORS in browser. In production, you'd need a proxy server.
      // For demo purposes, we'll show how it would work with a backend proxy
      const proxyUrl = `/api/places/search?${params.toString()}`;

      const response = await fetch(proxyUrl);

      if (!response.ok) {
        throw new Error('Failed to fetch places');
      }

      const data: PlacesSearchResponse = await response.json();

      if (data.status !== 'OK') {
        throw new Error(`Places API error: ${data.status}`);
      }

      return data.results;
    } catch (error) {
      console.error('Error searching places:', error);
      return [];
    }
  }

  async getPlaceDetails(placeId: string): Promise<GooglePlace | null> {
    if (!GOOGLE_PLACES_API_KEY) {
      return null;
    }

    try {
      const params = new URLSearchParams({
        place_id: placeId,
        key: GOOGLE_PLACES_API_KEY,
        fields: 'place_id,name,formatted_address,geometry,types,rating,photos,opening_hours',
      });

      const proxyUrl = `/api/places/details?${params.toString()}`;

      const response = await fetch(proxyUrl);

      if (!response.ok) {
        throw new Error('Failed to fetch place details');
      }

      const data = await response.json();

      if (data.status !== 'OK') {
        throw new Error(`Places API error: ${data.status}`);
      }

      return data.result;
    } catch (error) {
      console.error('Error fetching place details:', error);
      return null;
    }
  }

  // Convert Google Place to our Place interface
  convertToPlace(googlePlace: GooglePlace): import('../types').Place {
    const categorizePlace = (types: string[]): import('../types').Place['category'] => {
      const ancientTypes = ['museum', 'church', 'cemetery', 'tourist_attraction'];
      const mysticalTypes = ['place_of_worship', 'hindu_temple', 'synagogue', 'mosque'];
      const undergroundTypes = ['subway_station', 'train_station', 'parking'];

      if (types.some((type) => ancientTypes.includes(type))) return 'ancient';
      if (types.some((type) => mysticalTypes.includes(type))) return 'mystical';
      if (types.some((type) => undergroundTypes.includes(type))) return 'underground';
      return 'forgotten';
    };

    return {
      id: googlePlace.place_id,
      name: googlePlace.name,
      description: `${googlePlace.formatted_address} - A place of significance discovered through the ancient maps.`,
      latitude: googlePlace.geometry.location.lat,
      longitude: googlePlace.geometry.location.lng,
      category: categorizePlace(googlePlace.types),
      confidence: 0.8 + (googlePlace.rating ? (googlePlace.rating / 5) * 0.2 : 0),
      historicalPeriod: 'Modern Era',
      artifacts: ['Digital Echoes', 'Contemporary Resonance', 'Urban Mystique'],
    };
  }
}
