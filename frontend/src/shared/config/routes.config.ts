// Route paths configuration
export const ROUTES = {
  // Public routes
  LOGIN: '/login',

  // Protected routes
  DASHBOARD: '/dashboard',
  DEMS: '/dems',
  DATA_ENRICHMENT: '/de',
  CRON: '/cron',

  // Nested routes (for future use)
  DEMS_ENDPOINTS: '/dems/endpoints',
  DEMS_VALIDATION: '/dems/validation',
  DATA_ENRICHMENT_CONFIG: '/de/config',
  CRON_JOBS: '/cron/jobs',
  CRON_SCHEDULE: '/cron/schedule',
} as const;

// Navigation menu configuration
export const NAVIGATION = {
  mainModules: [
    {
      id: 'dems',
      name: 'Dynamic Endpoint Monitoring Service',
      description:
        'Monitor and manage API endpoints, configurations, and field mappings',
      path: ROUTES.DEMS,
      icon: 'ActivityIcon',
      color: 'bg-blue-100 text-blue-600',
    },
    {
      id: 'data-enrichment',
      name: 'Data Enrichment',
      description:
        'Enhance and transform your data with powerful enrichment tools',
      path: ROUTES.DATA_ENRICHMENT,
      icon: 'DatabaseIcon',
      color: 'bg-green-100 text-green-600',
    },
    {
      id: 'cron',
      name: 'CRON Job Management',
      description: 'Schedule and monitor automated tasks and jobs',
      path: ROUTES.CRON,
      icon: 'ClockIcon',
      color: 'bg-purple-100 text-purple-600',
    },
  ],
} as const;
