// Environment configuration
declare global {
  interface ImportMetaEnv {
    readonly VITE_API_BASE_URL?: string;
    readonly VITE_DATA_ENRICHMENT_SERVICE_URL?: string;
    readonly VITE_APP_TITLE?: string;
    readonly VITE_APP_ENV?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export const ENV = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL ?? 'http://10.10.80.37:3000',
  DATA_ENRICHMENT_SERVICE_URL:
    import.meta.env.VITE_DATA_ENRICHMENT_SERVICE_URL ??
    'http://10.10.80.37:3000/api',
  APP_TITLE: import.meta.env.VITE_APP_TITLE ?? 'Tazama Connection Studio',
  APP_ENV: import.meta.env.VITE_APP_ENV ?? 'development',
  IS_DEVELOPMENT: import.meta.env.DEV,
  IS_PRODUCTION: import.meta.env.PROD,
} as const;
