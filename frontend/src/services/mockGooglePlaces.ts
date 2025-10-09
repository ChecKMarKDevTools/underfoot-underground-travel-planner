// Mock Google Places service for demo purposes
// This simulates what would happen with real Google Places API integration

import { GooglePlace, GooglePlacesService } from './googlePlaces';
import { Place } from '../types';

export class MockGooglePlacesService extends GooglePlacesService {
  private mockPlaces: GooglePlace[] = [
    {
      place_id: 'ChIJ2WrMN9IDdkgRuhxSc_VQbjM',
      name: 'British Museum',
      formatted_address: 'Great Russell St, Bloomsbury, London WC1B 3DG, UK',
      geometry: {
        location: { lat: 51.5194, lng: -0.127 },
      },
      types: ['museum', 'tourist_attraction', 'establishment'],
      rating: 4.7,
      photos: [{ photo_reference: 'mock_ref_1', width: 4000, height: 3000 }],
      opening_hours: { open_now: true },
    },
    {
      place_id: 'ChIJb9OQmVoE9jIRARLnVbdqJ7w',
      name: 'Tower of London',
      formatted_address: "St Katharine's & Wapping, London EC3N 4AB, UK",
      geometry: {
        location: { lat: 51.5081, lng: -0.0759 },
      },
      types: ['tourist_attraction', 'establishment', 'point_of_interest'],
      rating: 4.6,
      photos: [{ photo_reference: 'mock_ref_2', width: 4000, height: 3000 }],
      opening_hours: { open_now: false },
    },
    {
      place_id: 'ChIJOwg_06VPwokRYv534QaPC8g',
      name: 'Westminster Abbey',
      formatted_address: '20 Deans Yd, Westminster, London SW1P 3PA, UK',
      geometry: {
        location: { lat: 51.4994, lng: -0.1273 },
      },
      types: ['church', 'place_of_worship', 'tourist_attraction', 'establishment'],
      rating: 4.5,
      photos: [{ photo_reference: 'mock_ref_3', width: 4000, height: 3000 }],
      opening_hours: { open_now: true },
    },
    {
      place_id: 'ChIJu-SviKsE9jIRXhMiW8yHuFk',
      name: 'London Bridge Underground Station',
      formatted_address: 'Railway Approach, London SE1 9SP, UK',
      geometry: {
        location: { lat: 51.5049, lng: -0.0863 },
      },
      types: ['subway_station', 'transit_station', 'establishment'],
      rating: 3.8,
      photos: [{ photo_reference: 'mock_ref_4', width: 4000, height: 3000 }],
      opening_hours: { open_now: true },
    },
    {
      place_id: 'ChIJ5yQbnENZwokR5heLRo1Gg-E',
      name: 'Highgate Cemetery',
      formatted_address: "Swain's Ln, Highgate, London N6 6PJ, UK",
      geometry: {
        location: { lat: 51.5668, lng: -0.1439 },
      },
      types: ['cemetery', 'tourist_attraction', 'establishment'],
      rating: 4.4,
      photos: [{ photo_reference: 'mock_ref_5', width: 4000, height: 3000 }],
      opening_hours: { open_now: false },
    },
    {
      place_id: 'ChIJOey_X2YE9jIR2AaVu7S5G-o',
      name: "St. Paul's Cathedral",
      formatted_address: "St. Paul's Churchyard, London EC4M 8AD, UK",
      geometry: {
        location: { lat: 51.5138, lng: -0.0984 },
      },
      types: ['church', 'place_of_worship', 'tourist_attraction', 'establishment'],
      rating: 4.7,
      photos: [{ photo_reference: 'mock_ref_6', width: 4000, height: 3000 }],
      opening_hours: { open_now: true },
    },
  ];

  async searchPlaces(
    query: string,
    location?: { lat: number; lng: number },
    _radius = 50000,
  ): Promise<GooglePlace[]> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Filter places based on query
    const lowercaseQuery = query.toLowerCase();
    const filteredPlaces = this.mockPlaces.filter(
      (place) =>
        place.name.toLowerCase().includes(lowercaseQuery) ||
        place.formatted_address.toLowerCase().includes(lowercaseQuery) ||
        place.types.some((type) => type.includes(lowercaseQuery)) ||
        // General keywords
        (lowercaseQuery.includes('ancient') &&
          ['museum', 'church', 'cemetery'].some((type) => place.types.includes(type))) ||
        (lowercaseQuery.includes('underground') && place.types.includes('subway_station')) ||
        (lowercaseQuery.includes('mystical') && place.types.includes('place_of_worship')) ||
        lowercaseQuery.includes('hidden') ||
        lowercaseQuery.includes('secret') ||
        lowercaseQuery.includes('forgotten'),
    );

    // If location is provided, sort by distance (simplified)
    if (location && filteredPlaces.length > 0) {
      filteredPlaces.sort((a, b) => {
        const distA = Math.sqrt(
          Math.pow(a.geometry.location.lat - location.lat, 2) +
            Math.pow(a.geometry.location.lng - location.lng, 2),
        );
        const distB = Math.sqrt(
          Math.pow(b.geometry.location.lat - location.lat, 2) +
            Math.pow(b.geometry.location.lng - location.lng, 2),
        );
        return distA - distB;
      });
    }

    return filteredPlaces.slice(0, 5); // Return max 5 results
  }

  async getPlaceDetails(placeId: string): Promise<GooglePlace | null> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    return this.mockPlaces.find((place) => place.place_id === placeId) || null;
  }

  // Enhanced conversion with more mystical descriptions
  convertToPlace(googlePlace: GooglePlace): Place {
    const categorizePlace = (types: string[]): Place['category'] => {
      const ancientTypes = ['museum', 'church', 'cemetery', 'tourist_attraction'];
      const mysticalTypes = ['place_of_worship', 'hindu_temple', 'synagogue', 'mosque'];
      const undergroundTypes = ['subway_station', 'train_station', 'parking'];

      if (types.some((type) => ancientTypes.includes(type))) return 'ancient';
      if (types.some((type) => mysticalTypes.includes(type))) return 'mystical';
      if (types.some((type) => undergroundTypes.includes(type))) return 'underground';
      return 'forgotten';
    };

    const generateMysticalDescription = (place: GooglePlace): string => {
      const category = categorizePlace(place.types);
      const baseDesc = `Located at ${place.formatted_address}`;

      switch (category) {
        case 'ancient':
          return `${baseDesc} - An ancient sanctuary where time itself seems to bend, revealing echoes of civilizations long past. The Stonewalker senses powerful resonance patterns here.`;
        case 'mystical':
          return `${baseDesc} - A sacred nexus where the veil between worlds grows thin. Spiritual energies converge here, creating ripples in the fabric of reality.`;
        case 'underground':
          return `${baseDesc} - Deep beneath the surface, hidden pathways echo with the footsteps of countless souls. The underground currents of the city pulse strongest here.`;
        default:
          return `${baseDesc} - A forgotten place where memories linger like whispers in the digital wind. The cyber-enhanced sight reveals secrets hidden in plain sight.`;
      }
    };

    const generateArtifacts = (types: string[]): string[] => {
      const artifacts = ['Digital Echoes', 'Temporal Fragments'];

      if (types.includes('museum')) artifacts.push("Curator's Stone", 'Preserved Memories');
      if (types.includes('church'))
        artifacts.push('Sacred Resonance Crystal', 'Prayer Echo Stones');
      if (types.includes('cemetery'))
        artifacts.push('Soul Anchor Points', 'Ethereal Boundary Markers');
      if (types.includes('subway_station'))
        artifacts.push('Transit Flow Conduits', 'Underground Energy Nodes');

      return artifacts.slice(0, 3);
    };

    const generatePlaceholderImage = (placeName: string): string => {
      // Generate a consistent image based on place name
      const imageIds = [
        'photo-1520637836862-4d197d17c90a', // dark tunnel/underground
        'photo-1446776877081-d282a0f896e2', // space/cosmic
        'photo-1558618666-fcd25c85cd64', // ancient architecture
        'photo-1469854523086-cc02fe5d8800', // mysterious landscape
        'photo-1518709414471-a345aee825fd', // cathedral/mystical
        'photo-1507003211169-0a1dd7228f2d', // cyberpunk city
      ];

      const hash = placeName.split('').reduce((a, b) => {
        a = (a << 5) - a + b.charCodeAt(0);
        return a & a;
      }, 0);

      const imageId = imageIds[Math.abs(hash) % imageIds.length];
      return `https://images.unsplash.com/${imageId}?w=300&h=200&fit=crop&auto=format`;
    };

    return {
      id: googlePlace.place_id,
      name: googlePlace.name,
      description: generateMysticalDescription(googlePlace),
      latitude: googlePlace.geometry.location.lat,
      longitude: googlePlace.geometry.location.lng,
      category: categorizePlace(googlePlace.types),
      confidence: 0.85 + (googlePlace.rating ? ((googlePlace.rating - 3) / 2) * 0.15 : 0),
      historicalPeriod: 'Cyber-Enhanced Era',
      artifacts: generateArtifacts(googlePlace.types),
      imageUrl: generatePlaceholderImage(googlePlace.name),
    };
  }
}

export const googlePlacesService = new MockGooglePlacesService();
