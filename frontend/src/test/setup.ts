// Mock environment config globally
jest.mock('../shared/config/environment.config', () => ({
  ENV: {
    API_BASE_URL: 'http://localhost:3000',
    DATA_ENRICHMENT_SERVICE_URL: 'http://localhost:3000',
    APP_TITLE: 'Tazama Connection Studio',
    APP_ENV: 'test',
    IS_DEVELOPMENT: true,
    IS_PRODUCTION: false,
  },
}));

// Mock TextEncoder and TextDecoder for Node.js environment
import { TextEncoder, TextDecoder } from 'util';
(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;

import '@testing-library/jest-dom';

// Mock IntersectionObserver
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: class {
    observe = jest.fn();
    unobserve = jest.fn();
    disconnect = jest.fn();
  },
});

// Mock ResizeObserver
Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: class {
    observe = jest.fn();
    unobserve = jest.fn();
    disconnect = jest.fn();
  },
});

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock: Storage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock environment variables
process.env.NODE_ENV = 'test';

// Mock import.meta.env
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
