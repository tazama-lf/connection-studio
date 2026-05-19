import { ENV } from './environment.config';

// App configuration constants
export const APP_CONFIG = {
  name: 'Tazama Connection Studio',
  version: '1.0.0',
  defaultRoute: '/dashboard',
  loginRoute: '/login',
} as const;

// API configuration (when you integrate APIs later)
export const API_CONFIG = {
  baseURL: ENV.API_BASE_URL,
  timeout: 10000,
  retries: 3,
} as const;

const PAGE_SIZE_XS = 5;
const PAGE_SIZE_SM = 10;
const PAGE_SIZE_MD = 20;
const PAGE_SIZE_LG = 50;

// UI configuration
export const UI_CONFIG = {
  themes: {
    primary: 'blue',
    secondary: 'gray',
    success: 'green',
    warning: 'yellow',
    danger: 'red',
  },
  pagination: {
    defaultPageSize: 10,
    pageSizeOptions: [PAGE_SIZE_XS, PAGE_SIZE_SM, PAGE_SIZE_MD, PAGE_SIZE_LG],
  },
  modals: {
    defaultWidth: 'max-w-4xl',
    overlayOpacity: 'bg-opacity-10',
  },
} as const;

// Feature flags (for enabling/disabling features)
export const FEATURE_FLAGS = {
  enableDEMS: true,
  enableDataEnrichment: true,
  enableCRONJobs: true,
  enableAdvancedMapping: true,
  enableSimulation: true,
} as const;
