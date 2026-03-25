import authServicesDefault, * as authServices from '@/features/auth/services/index';
import { authApi, AuthApiService } from '@/features/auth/services/authApi';

describe('features/auth/services/index.ts', () => {
  it('re-exports authApi as default export', () => {
    expect(authServicesDefault).toBe(authApi);
  });

  it('re-exports authApi symbols from authApi module', () => {
    expect(authServices.authApi).toBe(authApi);
    expect(authServices.AuthApiService).toBe(AuthApiService);
  });
});

