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

  return 'http://localhost:3000'; // All services running on port 3000
};

export const API_CONFIG = {
  // Base configuration
  AUTH_BASE_URL: getApiBaseUrl('auth'), // Auth service base URL
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
    },
  },
} as const;
