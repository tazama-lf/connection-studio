// Helper function to safely access environment variables
const getApiBaseUrl = (service: 'auth' | 'default' = 'default') => {
  // For test environment, use the fallback
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
    return service === 'auth'
      ? 'http://localhost:3000'
      : 'http://localhost:3001';
  }

  // For production/development, check if we have Vite environment
  if (typeof process !== 'undefined' && process.env.VITE_API_BASE_URL) {
    return process.env.VITE_API_BASE_URL;
  }

  return service === 'auth' ? 'http://localhost:3000' : 'http://localhost:3001';
};

export const API_CONFIG = {
  // Base configuration
  BASE_URL: getApiBaseUrl('default'), // Default for data enrichment and other services
  AUTH_BASE_URL: getApiBaseUrl('auth'), // Separate base URL for auth services
  TIMEOUT: 30000,

  // API versions
  VERSIONS: {
    V1: '/v1',
    V2: '/v2',
  },

  // Common headers
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },

  // Endpoints
  ENDPOINTS: {
    // Auth endpoints
    AUTH: {
      LOGIN: '/auth/login',
      LOGOUT: '/auth/logout',
      REFRESH: '/auth/refresh',
      PROFILE: '/auth/profile',
    },

    // DEMS endpoints
    DEMS: {
      ENDPOINTS: '/dems/endpoints',
      VALIDATE: '/dems/validate',
      LOGS: '/dems/logs',
      HISTORY: '/dems/history',
    },

    // Data Enrichment endpoints
    DATA_ENRICHMENT: {
      MAPPINGS: '/enrichment/mappings',
      TRANSFORM: '/enrichment/transform',
      TEMPLATES: '/enrichment/templates',
      JOBS: '/job',
    },

    // Schedule endpoints
    SCHEDULE: {
      CREATE: '/schedule/create',
      ALL: '/schedule/all',
      DELETE: '/schedule',
    },

    // CRON endpoints
    CRON: {
      JOBS: '/cron/jobs',
      SCHEDULE: '/cron/schedule',
      LOGS: '/cron/logs',
    },

    // Dashboard endpoints
    DASHBOARD: {
      ANALYTICS: '/dashboard/analytics',
      METRICS: '/dashboard/metrics',
    },
  },
} as const;
