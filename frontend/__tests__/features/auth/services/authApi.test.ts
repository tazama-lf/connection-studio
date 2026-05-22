import {
  authApi,
  AuthApiService,
} from '../../../../src/features/auth/services/authApi';

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('AuthApiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('test-token');
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const mockResponse = {
        message: 'Login successful',
        token: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.test.token',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      const credentials = { username: 'testuser', password: 'testpass' };
      const result = await authApi.login(credentials);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/auth/login',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(credentials),
        }),
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle login failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Invalid credentials' }),
      } as Response);

      const credentials = { username: 'invalid', password: 'invalid' };

      await expect(authApi.login(credentials)).rejects.toThrow('Unauthorized');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new TypeError('Network error'));

      const credentials = { username: 'testuser', password: 'testpass' };

      await expect(authApi.login(credentials)).rejects.toThrow('Network error');
    });

    it('should throw network error when TypeError contains fetch keyword', async () => {
      mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

      const credentials = { username: 'testuser', password: 'testpass' };

      await expect(authApi.login(credentials)).rejects.toThrow('Network error');
    });
  });

  describe('getProfile', () => {
    it('should fetch user profile', async () => {
      const mockProfile = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockProfile,
      } as Response);

      const result = await authApi.getProfile();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/auth/profile',
        expect.objectContaining({
          method: 'GET',
        }),
      );
      expect(result).toEqual(mockProfile);
    });

    it('should clear stored auth data on unauthorized profile request', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      } as Response);

      await expect(authApi.getProfile()).rejects.toThrow(
        'Unauthorized - Token expired',
      );
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('authToken');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('user');
    });

    it('should throw HTTP error when non-unauthorized non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server Error' }),
      } as Response);

      await expect(authApi.getProfile()).rejects.toThrow(
        'HTTP error! status: 500',
      );
    });

    it('should map undefined-property runtime errors to network error', async () => {
      mockFetch.mockRejectedValue(
        new Error('Cannot read properties of undefined (reading status)'),
      );

      await expect(authApi.getProfile()).rejects.toThrow('Network error');
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
      const result = AuthApiService.decodeToken(token);

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
      const result = AuthApiService.decodeToken(token);

      expect(result).toEqual({
        id: 'user-456',
        username: 'nesteduser',
        email: 'nested@example.com',
        claims: ['approver'],
        tenantId: 'tenant-001',
      });
    });

    it('should handle malformed tokens gracefully', () => {
      const result = AuthApiService.decodeToken('invalid.token');
      expect(result).toBeNull();
    });

    it('should handle empty token', () => {
      const result = AuthApiService.decodeToken('');
      expect(result).toBeNull();
    });

    it('should fall back to outer payload when inner token is malformed', () => {
      const outerPayload = {
        sub: 'user-789',
        preferred_username: 'fallbackuser',
        tokenString: 'malformed.inner.token',
        claims: ['editor'],
      };

      const token = createMockToken(outerPayload);
      const result = AuthApiService.decodeToken(token);

      expect(result).toEqual({
        id: 'user-789',
        username: 'fallbackuser',
        email: undefined,
        claims: ['editor'],
        tenantId: undefined,
      });
    });

    it('should use fallback values when fields are missing', () => {
      const payload = {}; // Empty payload

      const token = createMockToken(payload);
      const result = AuthApiService.decodeToken(token);

      expect(result).toEqual({
        id: 'unknown',
        username: 'user',
        email: undefined,
        claims: [],
        tenantId: undefined,
      });
    });

    it('should fallback to outer payload when tokenString is malformed (no second part)', () => {
      const outerPayload = {
        sub: 'outer-user',
        preferred_username: 'outeruser',
        email: 'outer@example.com',
        tokenString: 'notavalidjwt', // No dots, so no base64 parts
        claims: ['editor'],
        tenantId: 'tenant-xyz',
      };

      const token = createMockToken(outerPayload);
      const result = AuthApiService.decodeToken(token);

      expect(result?.id).toBe('outer-user');
      expect(result?.username).toBe('outeruser');
    });
  });
});
