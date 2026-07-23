// The actual module uses import.meta.env (Vite) which is mocked globally in jest.setup.ts.
// We test the mocked ENV values that all other modules consume.

describe('environment.config', () => {
  it('exports ENV with all expected keys from the global mock', () => {
    const { ENV } = require('@shared/config/environment.config');

    expect(ENV).toHaveProperty('API_BASE_URL');
    expect(ENV).toHaveProperty('DATA_ENRICHMENT_SERVICE_URL');
    expect(ENV).toHaveProperty('APP_TITLE');
    expect(ENV).toHaveProperty('APP_ENV');
  });

  it('provides correct mock values matching jest.setup.ts', () => {
    const { ENV } = require('@shared/config/environment.config');

    expect(ENV.API_BASE_URL).toBe('http://localhost:3000');
    expect(ENV.DATA_ENRICHMENT_SERVICE_URL).toBe('http://localhost:3000/api');
    expect(ENV.APP_TITLE).toBe('Tazama Connection Studio');
    expect(ENV.APP_ENV).toBe('test');
  });

  it('has expected types for all ENV properties', () => {
    const { ENV } = require('@shared/config/environment.config');

    expect(typeof ENV.API_BASE_URL).toBe('string');
    expect(typeof ENV.DATA_ENRICHMENT_SERVICE_URL).toBe('string');
    expect(typeof ENV.APP_TITLE).toBe('string');
    expect(typeof ENV.APP_ENV).toBe('string');
  });
});
