import { API_CONFIG } from '@/shared/config/api.config';

describe('shared/config/api.config.ts', () => {
  it('defines expected base urls and default headers', () => {
    expect(API_CONFIG.API_BASE_URL).toBe('http://localhost:3000');
    expect(API_CONFIG.AUTH_BASE_URL).toBe(API_CONFIG.API_BASE_URL);
    expect(API_CONFIG.DEFAULT_HEADERS).toEqual({
      'Content-Type': 'application/json',
      Accept: 'application/json',
    });
  });

  it('exposes auth and config endpoint templates', () => {
    expect(API_CONFIG.ENDPOINTS.AUTH.LOGIN).toBe('/auth/login');
    expect(API_CONFIG.ENDPOINTS.AUTH.PROFILE).toBe('/auth/profile');
    expect(API_CONFIG.ENDPOINTS.CONFIG.CREATE).toBe('/config');
    expect(API_CONFIG.ENDPOINTS.CONFIG.ADD_MAPPING).toContain('/mapping');
    expect(API_CONFIG.ENDPOINTS.CONFIG.UPDATE_FUNCTION).toContain(
      '/function/:index',
    );
  });
});
