import { describe, it, expect, vi, beforeEach } from 'vitest';
import { googlePlacesService } from '../../src/services/mockGooglePlaces';

vi.mock('../../src/services/mockGooglePlaces', async () => {
  const actual = await vi.importActual('../../src/services/mockGooglePlaces');
  return actual;
});

describe('MockGooglePlacesService', () => {
  beforeEach(() => {
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  describe('searchPlaces', () => {
    it('should return places matching query by name', async () => {
      const promise = googlePlacesService.searchPlaces('British Museum');
      vi.runAllTimers();
      const results = await promise;

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toContain('British Museum');
    });

    it('should return places matching query by keyword', async () => {
      const promise = googlePlacesService.searchPlaces('ancient');
      vi.runAllTimers();
      const results = await promise;

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should return places matching underground keyword', async () => {
      const promise = googlePlacesService.searchPlaces('underground');
      vi.runAllTimers();
      const results = await promise;

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should return places matching mystical keyword', async () => {
      const promise = googlePlacesService.searchPlaces('mystical');
      vi.runAllTimers();
      const results = await promise;

      expect(results).toBeInstanceOf(Array);
    });

    it('should limit results to 5', async () => {
      const promise = googlePlacesService.searchPlaces('london');
      vi.runAllTimers();
      const results = await promise;

      expect(results.length).toBeLessThanOrEqual(5);
    });

    it('should return empty array for no matches', async () => {
      const promise = googlePlacesService.searchPlaces('xyzabc123notfound');
      vi.runAllTimers();
      const results = await promise;

      expect(results).toEqual([]);
    });

    it('should filter by address', async () => {
      const promise = googlePlacesService.searchPlaces('Great Russell');
      vi.runAllTimers();
      const results = await promise;

      expect(results.length).toBeGreaterThan(0);
    });

    it('should be case insensitive', async () => {
      const promise = googlePlacesService.searchPlaces('TOWER OF LONDON');
      vi.runAllTimers();
      const results = await promise;

      expect(results.length).toBeGreaterThan(0);
    });

    it('should sort by distance when location provided', async () => {
      const location = { lat: 51.5074, lng: -0.1278 };
      const promise = googlePlacesService.searchPlaces('london', location);
      vi.runAllTimers();
      const results = await promise;

      if (results.length > 1) {
        const distances = results.map((place) => {
          const lat = place.geometry.location.lat;
          const lng = place.geometry.location.lng;
          return Math.sqrt(Math.pow(lat - location.lat, 2) + Math.pow(lng - location.lng, 2));
        });

        for (let i = 1; i < distances.length; i++) {
          expect(distances[i]).toBeGreaterThanOrEqual(distances[i - 1]);
        }
      }
    });

    it('should include all required GooglePlace fields', async () => {
      const promise = googlePlacesService.searchPlaces('museum');
      vi.runAllTimers();
      const results = await promise;

      results.forEach((place) => {
        expect(place).toHaveProperty('place_id');
        expect(place).toHaveProperty('name');
        expect(place).toHaveProperty('formatted_address');
        expect(place).toHaveProperty('geometry');
        expect(place.geometry).toHaveProperty('location');
        expect(place.geometry.location).toHaveProperty('lat');
        expect(place.geometry.location).toHaveProperty('lng');
        expect(place).toHaveProperty('types');
        expect(place).toHaveProperty('rating');
      });
    });
  });

  describe('getPlaceDetails', () => {
    it('should return place by ID', async () => {
      const promise = googlePlacesService.getPlaceDetails('ChIJ2WrMN9IDdkgRuhxSc_VQbjM');
      vi.runAllTimers();
      const result = await promise;

      expect(result).not.toBeNull();
      expect(result?.place_id).toBe('ChIJ2WrMN9IDdkgRuhxSc_VQbjM');
    });

    it('should return null for invalid ID', async () => {
      const promise = googlePlacesService.getPlaceDetails('invalid-id');
      vi.runAllTimers();
      const result = await promise;

      expect(result).toBeNull();
    });

    it('should simulate delay', async () => {
      const promise = googlePlacesService.getPlaceDetails('ChIJ2WrMN9IDdkgRuhxSc_VQbjM');

      let resolved = false;
      promise.then(() => {
        resolved = true;
      });

      await vi.advanceTimersByTimeAsync(400);
      expect(resolved).toBe(false);

      await vi.advanceTimersByTimeAsync(200);
      await promise;
      expect(resolved).toBe(true);
    });
  });

  describe('convertToPlace', () => {
    it('should convert GooglePlace to Place', async () => {
      const promise = googlePlacesService.searchPlaces('British Museum');
      vi.runAllTimers();
      const googlePlaces = await promise;

      const place = googlePlacesService.convertToPlace(googlePlaces[0]);

      expect(place).toHaveProperty('id');
      expect(place).toHaveProperty('name');
      expect(place).toHaveProperty('description');
      expect(place).toHaveProperty('latitude');
      expect(place).toHaveProperty('longitude');
      expect(place).toHaveProperty('category');
      expect(place).toHaveProperty('confidence');
    });

    it('should categorize museum as ancient', async () => {
      const promise = googlePlacesService.searchPlaces('British Museum');
      vi.runAllTimers();
      const googlePlaces = await promise;

      const place = googlePlacesService.convertToPlace(googlePlaces[0]);

      expect(place.category).toBe('ancient');
    });

    it('should categorize cemetery appropriately', async () => {
      const promise = googlePlacesService.searchPlaces('Highgate');
      vi.runAllTimers();
      const googlePlaces = await promise;

      if (googlePlaces.length > 0) {
        const place = googlePlacesService.convertToPlace(googlePlaces[0]);
        expect(['forgotten', 'mystical', 'ancient']).toContain(place.category);
      }
    });

    it('should calculate confidence from rating', async () => {
      const promise = googlePlacesService.searchPlaces('British Museum');
      vi.runAllTimers();
      const googlePlaces = await promise;

      const place = googlePlacesService.convertToPlace(googlePlaces[0]);

      expect(place.confidence).toBeGreaterThanOrEqual(0);
      expect(place.confidence).toBeLessThanOrEqual(1);
    });

    it('should generate mystical description', async () => {
      const promise = googlePlacesService.searchPlaces('British Museum');
      vi.runAllTimers();
      const googlePlaces = await promise;

      const place = googlePlacesService.convertToPlace(googlePlaces[0]);

      expect(place.description).toBeTruthy();
      expect(place.description.length).toBeGreaterThan(0);
    });

    it('should generate artifacts for ancient places', async () => {
      const promise = googlePlacesService.searchPlaces('British Museum');
      vi.runAllTimers();
      const googlePlaces = await promise;

      const place = googlePlacesService.convertToPlace(googlePlaces[0]);

      if (place.category === 'ancient') {
        expect(place.artifacts).toBeDefined();
        expect(place.artifacts?.length).toBeGreaterThan(0);
      }
    });

    it('should generate valid Unsplash image URL', async () => {
      const promise = googlePlacesService.searchPlaces('British Museum');
      vi.runAllTimers();
      const googlePlaces = await promise;

      const place = googlePlacesService.convertToPlace(googlePlaces[0]);

      expect(place.imageUrl).toContain('unsplash.com');
    });

    it('should generate consistent image URL for same place', async () => {
      const promise = googlePlacesService.searchPlaces('British Museum');
      vi.runAllTimers();
      const googlePlaces = await promise;

      const place1 = googlePlacesService.convertToPlace(googlePlaces[0]);
      const place2 = googlePlacesService.convertToPlace(googlePlaces[0]);

      expect(place1.imageUrl).toBe(place2.imageUrl);
    });

    it('should include historical period for some places', async () => {
      const promise = googlePlacesService.searchPlaces('Tower');
      vi.runAllTimers();
      const googlePlaces = await promise;

      if (googlePlaces.length > 0) {
        const place = googlePlacesService.convertToPlace(googlePlaces[0]);

        if (place.category === 'ancient' || place.category === 'forgotten') {
          expect(place.historicalPeriod).toBeDefined();
        }
      }
    });
  });
});
