import * as configIndex from '@/shared/config';
import { API_CONFIG } from '@/shared/config/api.config';
import { APP_CONFIG } from '@/shared/config/app.config';
import { ENV } from '@/shared/config/environment.config';

describe('shared/config/index.ts', () => {
  it('re-exports key config modules', () => {
    expect(configIndex.API_CONFIG).toBe(API_CONFIG);
    expect(configIndex.APP_CONFIG).toBe(APP_CONFIG);
    expect(configIndex.ENV).toBe(ENV);
  });

  it('re-exports routes config contract', () => {
    expect(configIndex.ROUTES.LOGIN).toBe('/login');
    expect(configIndex.ROUTES.DASHBOARD).toBe('/dashboard');
  });
});
