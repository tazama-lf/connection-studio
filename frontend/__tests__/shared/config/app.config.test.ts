import {
  APP_CONFIG,
  API_CONFIG,
  UI_CONFIG,
  FEATURE_FLAGS,
} from '@/shared/config/app.config';

describe('shared/config/app.config.ts', () => {
  it('defines app identity and routing defaults', () => {
    expect(APP_CONFIG.name).toBe('Tazama Connection Studio');
    expect(APP_CONFIG.defaultRoute).toBe('/dashboard');
    expect(APP_CONFIG.loginRoute).toBe('/login');
  });

  it('defines API retry/timeout and UI pagination defaults', () => {
    expect(API_CONFIG.baseURL).toBe('http://localhost:3000');
    expect(API_CONFIG.timeout).toBe(10000);
    expect(API_CONFIG.retries).toBe(3);

    expect(UI_CONFIG.pagination.defaultPageSize).toBe(10);
    expect(UI_CONFIG.pagination.pageSizeOptions).toContain(50);
  });

  it('has critical feature flags enabled', () => {
    expect(FEATURE_FLAGS.enableDEMS).toBe(true);
    expect(FEATURE_FLAGS.enableDataEnrichment).toBe(true);
    expect(FEATURE_FLAGS.enableCRONJobs).toBe(true);
  });
});
