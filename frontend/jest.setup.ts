// Global Jest setup for all tests

import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'node:util';

// Mock environment config (Vite import.meta.env replacement)
jest.mock('@shared/config/environment.config', () => ({
  ENV: {
    API_BASE_URL: 'http://localhost:3000',
    DATA_ENRICHMENT_SERVICE_URL: 'http://localhost:3000/api',
    APP_TITLE: 'Tazama Connection Studio',
    APP_ENV: 'test',
    IS_DEVELOPMENT: false,
    IS_PRODUCTION: false,
  },
}));

process.env.NODE_ENV = 'test';

// Mock import.meta.env (for Vite)
Object.defineProperty(global, 'import', {
  value: {
    meta: {
      env: {
        VITE_API_BASE_URL: 'http://localhost:3000',
        VITE_DATA_ENRICHMENT_SERVICE_URL: 'http://localhost:3000',
        VITE_APP_TITLE: 'Tazama Connection Studio',
        VITE_APP_ENV: 'test',
        DEV: true,
        PROD: false,
      },
    },
  },
});

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as typeof global.TextDecoder;

if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = <T>(value: T): T =>
    JSON.parse(JSON.stringify(value));
}

global.fetch = jest.fn();

const localStorageMock: Storage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
} as unknown as typeof global.IntersectionObserver;

// ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as unknown as typeof global.ResizeObserver;

Element.prototype.scrollIntoView = function () {};

if (!HTMLElement.prototype.scrollTo) {
  HTMLElement.prototype.scrollTo = function () {};
}

afterEach(() => {
  jest.clearAllMocks();
  (global.fetch as jest.Mock).mockReset?.();
});
