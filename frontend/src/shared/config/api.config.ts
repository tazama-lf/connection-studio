import { ENV } from './environment.config';

export const API_CONFIG = {
  // Base configuration - URLs from centralized environment config
  API_BASE_URL: ENV.API_BASE_URL,
  AUTH_BASE_URL: ENV.API_BASE_URL, // Auth service uses same URL as API
  DATA_ENRICHMENT_BASE_URL: ENV.DATA_ENRICHMENT_SERVICE_URL,
  TIMEOUT: 30000,

  // Common headers
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },

  // Endpoints - Authentication and Configuration endpoints
  ENDPOINTS: {
    // Auth endpoints
    AUTH: {
      LOGIN: '/auth/login',
      LOGOUT: '/auth/logout',
      REFRESH: '/auth/refresh',
      PROFILE: '/auth/profile',
    },
    // Configuration endpoints
    CONFIG: {
      CREATE: '/config',
      UPLOAD: '/config/upload',
      GET_BY_ID: '/config/:id',
      GET_ALL: '/config',
      UPDATE: '/config/:id',
      DELETE: '/config/:id',
      ADD_MAPPING: '/config/:id/mapping',
      REMOVE_MAPPING: '/config/:id/mapping/:index',
      GET_BY_TRANSACTION_TYPE: '/config/transaction/:type',
      GET_BY_ENDPOINT: '/config/endpoint',
      // Function endpoints
      ADD_FUNCTION: '/config/:id/function',
      UPDATE_FUNCTION: '/config/:id/function/:index',
      DELETE_FUNCTION: '/config/:id/function/:index',
    },
  },
} as const;
