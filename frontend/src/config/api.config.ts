export const API_CONFIG = {
  // Base configuration
  BASE_URL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api",
  TIMEOUT: 30000,

  // API versions
  VERSIONS: {
    V1: "/v1",
    V2: "/v2",
  },

  // Common headers
  DEFAULT_HEADERS: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },

  // Endpoints
  ENDPOINTS: {
    // Auth endpoints
    AUTH: {
      LOGIN: "/auth/login",
      LOGOUT: "/auth/logout",
      REFRESH: "/auth/refresh",
      PROFILE: "/auth/profile",
    },

    // DEMS endpoints
    DEMS: {
      ENDPOINTS: "/dems/endpoints",
      VALIDATE: "/dems/validate",
      LOGS: "/dems/logs",
      HISTORY: "/dems/history",
    },

    // Data Enrichment endpoints
    DATA_ENRICHMENT: {
      MAPPINGS: "/enrichment/mappings",
      TRANSFORM: "/enrichment/transform",
      TEMPLATES: "/enrichment/templates",
    },

    // CRON endpoints
    CRON: {
      JOBS: "/cron/jobs",
      SCHEDULE: "/cron/schedule",
      LOGS: "/cron/logs",
    },

    // Dashboard endpoints
    DASHBOARD: {
      ANALYTICS: "/dashboard/analytics",
      METRICS: "/dashboard/metrics",
    },
  },
} as const;
