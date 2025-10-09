import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

afterEach(() => {
  cleanup();
  localStorage.clear();
});

// Suppress act() warnings from framer-motion animations
// These are unavoidable false positives caused by animation state updates
// that occur outside React's test callstack. Mocking framer-motion breaks
// component functionality, so filtering these specific warnings is the
// recommended approach per React Testing Library's FAQ on animation libraries.
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: An update to') &&
      args[0].includes('was not wrapped in act')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
});

// Mock Google Maps API
(global as any).google = {
  maps: {
    Map: vi.fn(() => ({
      setCenter: vi.fn(),
      setZoom: vi.fn(),
      addListener: vi.fn(),
    })),
    Marker: vi.fn(() => ({
      setMap: vi.fn(),
      addListener: vi.fn(),
    })),
    InfoWindow: vi.fn(() => ({
      open: vi.fn(),
      close: vi.fn(),
    })),
    Size: vi.fn((width, height) => ({ width, height })),
    Point: vi.fn((x, y) => ({ x, y })),
    Animation: {
      DROP: 'DROP',
    },
  },
};
