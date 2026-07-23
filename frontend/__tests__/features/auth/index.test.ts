jest.mock('@/features/auth/pages/Login', () => ({
  __esModule: true,
  default: function MockLogin() {
    return null;
  },
}));

jest.mock('@/features/auth/contexts/AuthContext', () => ({
  AuthProvider: function MockAuthProvider({ children }: { children: unknown }) {
    return children ?? null;
  },
  useAuth: jest.fn(),
}));

import * as authIndex from '@/features/auth';
import Login from '@/features/auth/pages/Login';
import { AuthProvider, useAuth } from '@/features/auth/contexts/AuthContext';

describe('features/auth/index.ts', () => {
  it('re-exports Login, AuthProvider and useAuth', () => {
    expect(authIndex.Login).toBe(Login);
    expect(authIndex.AuthProvider).toBe(AuthProvider);
    expect(authIndex.useAuth).toBe(useAuth);
  });
});
