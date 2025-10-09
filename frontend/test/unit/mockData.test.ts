import { describe, it, expect } from 'vitest';
import { mockPlaces, generateMockDebugData } from '../../src/data/mockData';

describe('Mock Data', () => {
  describe('mockPlaces', () => {
    it('should have valid place structure', () => {
      expect(mockPlaces).toBeInstanceOf(Array);
      expect(mockPlaces.length).toBeGreaterThan(0);
    });

    it('should have all required Place fields', () => {
      mockPlaces.forEach((place) => {
        expect(place).toHaveProperty('id');
        expect(place).toHaveProperty('name');
        expect(place).toHaveProperty('description');
        expect(place).toHaveProperty('latitude');
        expect(place).toHaveProperty('longitude');
        expect(place).toHaveProperty('category');
        expect(place).toHaveProperty('confidence');
      });
    });

    it('should have valid coordinates', () => {
      mockPlaces.forEach((place) => {
        expect(place.latitude).toBeGreaterThan(-90);
        expect(place.latitude).toBeLessThan(90);
        expect(place.longitude).toBeGreaterThan(-180);
        expect(place.longitude).toBeLessThan(180);
      });
    });

    it('should have valid confidence values', () => {
      mockPlaces.forEach((place) => {
        expect(place.confidence).toBeGreaterThanOrEqual(0);
        expect(place.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should have valid categories', () => {
      const validCategories = ['ancient', 'mystical', 'underground', 'forgotten'];
      mockPlaces.forEach((place) => {
        expect(validCategories).toContain(place.category);
      });
    });
  });

  describe('generateMockDebugData', () => {
    it('should generate debug data with all required fields', () => {
      const debugData = generateMockDebugData('test query');
      expect(debugData).toHaveProperty('searchQuery');
      expect(debugData).toHaveProperty('processingTime');
      expect(debugData).toHaveProperty('confidence');
      expect(debugData).toHaveProperty('keywords');
      expect(debugData).toHaveProperty('geospatialData');
      expect(debugData).toHaveProperty('llmReasoning');
      expect(debugData).toHaveProperty('dataSource');
    });

    it('should use the provided query', () => {
      const query = 'ancient underground temples';
      const debugData = generateMockDebugData(query);
      expect(debugData.searchQuery).toBe(query);
    });

    it('should extract keywords correctly', () => {
      const query = 'find ancient underground temples';
      const debugData = generateMockDebugData(query);
      expect(debugData.keywords).toContain('find');
      expect(debugData.keywords).toContain('ancient');
      expect(debugData.keywords).toContain('underground');
      expect(debugData.keywords).toContain('temples');
    });

    it('should filter out short keywords', () => {
      const query = 'a in at ancient temple';
      const debugData = generateMockDebugData(query);
      debugData.keywords.forEach((keyword) => {
        expect(keyword.length).toBeGreaterThan(2);
      });
    });

    it('should have processing time in valid range', () => {
      const debugData = generateMockDebugData('test');
      expect(debugData.processingTime).toBeGreaterThanOrEqual(500);
      expect(debugData.processingTime).toBeLessThanOrEqual(2500);
    });

    it('should have confidence in valid range', () => {
      const debugData = generateMockDebugData('test');
      expect(debugData.confidence).toBeGreaterThanOrEqual(0.7);
      expect(debugData.confidence).toBeLessThanOrEqual(1.0);
    });

    it('should have geospatial data structure', () => {
      const debugData = generateMockDebugData('test');
      expect(debugData.geospatialData).toHaveProperty('boundingBox');
      expect(debugData.geospatialData).toHaveProperty('centerPoint');
      expect(debugData.geospatialData).toHaveProperty('searchRadius');
    });

    it('should have valid data sources', () => {
      const debugData = generateMockDebugData('test');
      expect(Array.isArray(debugData.dataSource)).toBe(true);
      expect(debugData.dataSource.length).toBeGreaterThan(0);
    });

    it('should include query in LLM reasoning', () => {
      const query = 'mystical locations';
      const debugData = generateMockDebugData(query);
      expect(debugData.llmReasoning).toContain(query);
    });
  });
});
