import servicesModule from '@/features/config/services/index';
import { configApi } from '@/features/config/services/configApi';
import * as namedExports from '@/features/config/services/index';

describe('features/config/services/index.ts', () => {
  it('re-exports configApi as default export', () => {
    expect(servicesModule).toBe(configApi);
  });

  it('re-exports configApi symbols from configApi module', () => {
    expect(namedExports.configApi).toBe(configApi);
    expect(typeof namedExports.ConfigApiService).toBe('function');
  });
});
