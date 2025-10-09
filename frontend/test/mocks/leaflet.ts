import { vi } from 'vitest';

const mockMap = {
  setView: vi.fn().mockReturnThis(),
  on: vi.fn().mockReturnThis(),
  off: vi.fn().mockReturnThis(),
  eachLayer: vi.fn(),
  remove: vi.fn(),
};

const mockMarker = {
  addTo: vi.fn().mockReturnThis(),
  bindPopup: vi.fn().mockReturnThis(),
  openPopup: vi.fn().mockReturnThis(),
  on: vi.fn().mockReturnThis(),
  options: {},
};

export const L = {
  map: vi.fn(() => mockMap),
  tileLayer: vi.fn(() => ({
    addTo: vi.fn(),
  })),
  marker: vi.fn(() => mockMarker),
  icon: vi.fn(() => ({})),
  divIcon: vi.fn(() => ({})),
  Marker: class Marker {
    options: any;
    constructor(latlng: any, options: any) {
      this.options = options;
    }
    openPopup = vi.fn();
  },
};

vi.mock('leaflet', () => ({
  default: L,
  ...L,
}));
