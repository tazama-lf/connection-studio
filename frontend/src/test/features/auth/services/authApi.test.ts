import { authApi } from '../../../../features/auth/services/authApi';

// Mock the API client
jest.mock('../../../../shared/services/apiClient', () => ({
  apiClient: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

import { apiClient } from '../../../../shared/services/apiClient';

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('AuthApiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const mockResponse = {
        message: 'Login successful',
        token: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.test.token',
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const credentials = { username: 'testuser', password: 'testpass' };
      const result = await authApi.login(credentials);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/auth/login',
        credentials,
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle login failure', async () => {
      const mockError = new Error('Invalid credentials');
      mockApiClient.post.mockRejectedValue(mockError);

      const credentials = { username: 'invalid', password: 'invalid' };

      await expect(authApi.login(credentials)).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      mockApiClient.post.mockRejectedValue(networkError);

      const credentials = { username: 'testuser', password: 'testpass' };

      await expect(authApi.login(credentials)).rejects.toThrow('Network error');
    });
  });

  describe('logout', () => {
    it('should call logout endpoint', async () => {
      mockApiClient.post.mockResolvedValue(undefined);

      await authApi.logout();

      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/logout');
    });

    it('should handle logout errors gracefully', async () => {
      const mockError = new Error('Logout failed');
      mockApiClient.post.mockRejectedValue(mockError);

      await expect(authApi.logout()).rejects.toThrow('Logout failed');
    });
  });

  describe('getProfile', () => {
    it('should fetch user profile', async () => {
      const mockProfile = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
      };

      mockApiClient.get.mockResolvedValue(mockProfile);

      const result = await authApi.getProfile();

      expect(mockApiClient.get).toHaveBeenCalledWith('/auth/profile');
      expect(result).toEqual(mockProfile);
    });
  });

  describe('decodeToken', () => {
    const createMockToken = (payload: Record<string, unknown>) => {
      const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
      const encodedPayload = btoa(JSON.stringify(payload));
      const signature = 'mock-signature';
      return `${header}.${encodedPayload}.${signature}`;
    };

    it('should decode simple token correctly', () => {
      const payload = {
        sub: 'user-123',
        preferred_username: 'testuser',
        email: 'test@example.com',
        claims: ['approver', 'editor'],
      };

      const token = createMockToken(payload);
      const result = authApi.decodeToken(token);

      expect(result).toEqual({
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        claims: ['approver', 'editor'],
        tenantId: undefined,
      });
    });

    it('should decode nested token with tokenString', () => {
      const innerPayload = {
        sub: 'user-456',
        preferred_username: 'nesteduser',
        email: 'nested@example.com',
        realm_access: {
          roles: ['publisher', 'editor'],
        },
      };

      const outerPayload = {
        clientId: 'client-123',
        tokenString: createMockToken(innerPayload),
        claims: ['approver'],
        tenantId: 'tenant-001',
      };

      const token = createMockToken(outerPayload);
      const result = authApi.decodeToken(token);

      expect(result).toEqual({
        id: 'user-456',
        username: 'nesteduser',
        email: 'nested@example.com',
        claims: ['approver'],
        tenantId: 'tenant-001',
      });
    });

    it('should handle malformed tokens gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = authApi.decodeToken('invalid.token');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to decode token:',
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });

    it('should handle empty token', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = authApi.decodeToken('');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should fall back to outer payload when inner token is malformed', () => {
      const outerPayload = {
        sub: 'user-789',
        preferred_username: 'fallbackuser',
        tokenString: 'malformed.inner.token',
        claims: ['editor'],
      };

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const token = createMockToken(outerPayload);
      const result = authApi.decodeToken(token);

      expect(result).toEqual({
        id: 'user-789',
        username: 'fallbackuser',
        email: undefined,
        claims: ['editor'],
        tenantId: undefined,
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to decode inner token, using outer payload:',
        expect.any(Error),
      );

      consoleWarnSpy.mockRestore();
    });

    it('should use fallback values when fields are missing', () => {
      const payload = {}; // Empty payload

      const token = createMockToken(payload);
      const result = authApi.decodeToken(token);

      expect(result).toEqual({
        id: 'unknown',
        username: 'user',
        email: undefined,
        claims: [],
        tenantId: undefined,
      });
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const mockResponse = {
        message: 'Token refreshed',
        token: 'new.jwt.token',
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await authApi.refreshToken();

      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/refresh');
      expect(result).toEqual(mockResponse);
    });
  });
});
