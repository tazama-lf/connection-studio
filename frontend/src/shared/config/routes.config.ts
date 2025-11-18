// Route paths configuration
export const ROUTES = {
  // Public routes
  LOGIN: '/login',

  // Protected routes
  DASHBOARD: '/dashboard',
  DEMS: '/dems',
  DATA_ENRICHMENT: 'data-enrichment',
  CRON: '/cron',
  // APPROVER: '/approver',
  PUBLISHER: '/publisher',

  // Nested routes
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
      name: 'Cron Job Management',
      description:
        'Schedule and manage automated tasks and background processes',
      path: ROUTES.CRON,
      icon: 'ClockIcon',
      color: 'bg-purple-100 text-purple-600',
    },
    // {
    //   id: 'approver',
    //   name: 'Approver Dashboard',
    //   description: 'Review and approve submitted configuration changes',
    //   path: ROUTES.APPROVER,
    //   icon: 'CheckCircleIcon',
    //   color: 'bg-yellow-100 text-yellow-600',
    // },
    {
      id: 'publisher',
      name: 'Publisher Dashboard',
      description: 'Publish approved configurations and deploy endpoints',
      path: ROUTES.PUBLISHER,
      icon: 'UploadIcon',
      color: 'bg-orange-100 text-orange-600',
    },
  ],
} as const;
