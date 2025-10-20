import {
  globalTokenManager,
  apiRequest,
  isTokenLikelyExpired,
  type TokenExpirationHandler,
} from '../../../shared/services/tokenManager';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock fetch
global.fetch = jest.fn();

describe('GlobalTokenManager', () => {
  let mockHandler: TokenExpirationHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    mockHandler = {
      onTokenExpired: jest.fn(),
      isModalOpen: false,
    };
  });

  describe('subscribe', () => {
    it('should add handler to handlers set', () => {
      const unsubscribe = globalTokenManager.subscribe(mockHandler);
      expect(globalTokenManager['handlers'].has(mockHandler)).toBe(true);

      unsubscribe();
      expect(globalTokenManager['handlers'].has(mockHandler)).toBe(false);
    });

    it('should return unsubscribe function that removes handler', () => {
      const unsubscribe = globalTokenManager.subscribe(mockHandler);
      expect(globalTokenManager['handlers'].has(mockHandler)).toBe(true);

      unsubscribe();
      expect(globalTokenManager['handlers'].has(mockHandler)).toBe(false);
    });
  });

  describe('handleTokenExpiration', () => {
    it('should clear tokens from localStorage', () => {
      globalTokenManager.handleTokenExpiration();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('authToken');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('user');
    });

    it('should call onTokenExpired for all handlers', () => {
      const handler1 = { onTokenExpired: jest.fn(), isModalOpen: false };
      const handler2 = { onTokenExpired: jest.fn(), isModalOpen: false };

      globalTokenManager.subscribe(handler1);
      globalTokenManager.subscribe(handler2);

      globalTokenManager.handleTokenExpiration();

      expect(handler1.onTokenExpired).toHaveBeenCalledTimes(1);
      expect(handler2.onTokenExpired).toHaveBeenCalledTimes(1);
    });

    it('should handle handler errors gracefully', () => {
      const errorHandler = {
        onTokenExpired: jest.fn().mockImplementation(() => {
          throw new Error('Handler error');
        }),
        isModalOpen: false,
      };
      const goodHandler = { onTokenExpired: jest.fn(), isModalOpen: false };

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      globalTokenManager.subscribe(errorHandler);
      globalTokenManager.subscribe(goodHandler);

      globalTokenManager.handleTokenExpiration();

      expect(errorHandler.onTokenExpired).toHaveBeenCalledTimes(1);
      expect(goodHandler.onTokenExpired).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error in token expiration handler:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should prevent multiple simultaneous calls', () => {
      globalTokenManager.handleTokenExpiration();
      globalTokenManager.handleTokenExpiration();

      expect(localStorageMock.removeItem).toHaveBeenCalledTimes(2); // Called once per call
    });
  });

  describe('isAnyModalOpen', () => {
    it('should return false when no handlers are subscribed', () => {
      expect(globalTokenManager.isAnyModalOpen()).toBe(false);
    });

    it('should return false when all handlers have isModalOpen false', () => {
      const handler1 = { onTokenExpired: jest.fn(), isModalOpen: false };
      const handler2 = { onTokenExpired: jest.fn(), isModalOpen: false };

      globalTokenManager.subscribe(handler1);
      globalTokenManager.subscribe(handler2);

      expect(globalTokenManager.isAnyModalOpen()).toBe(false);
    });

    it('should return true when any handler has isModalOpen true', () => {
      const handler1 = { onTokenExpired: jest.fn(), isModalOpen: false };
      const handler2 = { onTokenExpired: jest.fn(), isModalOpen: true };

      globalTokenManager.subscribe(handler1);
      globalTokenManager.subscribe(handler2);

      expect(globalTokenManager.isAnyModalOpen()).toBe(true);
    });
  });
});

describe('apiRequest', () => {
  const mockUrl = 'https://api.example.com/test';
  const mockToken = 'mock-jwt-token';
  const mockResponse = { data: 'test' };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(mockResponse),
    });
  });

  it('should make request with correct headers', async () => {
    localStorageMock.getItem.mockReturnValue(mockToken);

    await apiRequest(mockUrl);

    expect(global.fetch).toHaveBeenCalledWith(mockUrl, {
      headers: expect.any(Headers),
    });

    const callArgs = (global.fetch as jest.Mock).mock.calls[0];
    const headers = callArgs[1].headers as Headers;

    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
  });

  it('should make request without Authorization header when no token', async () => {
    localStorageMock.getItem.mockReturnValue(null);

    await apiRequest(mockUrl);

    const callArgs = (global.fetch as jest.Mock).mock.calls[0];
    const headers = callArgs[1].headers as Headers;

    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('Authorization')).toBeNull();
  });

  it('should handle successful response', async () => {
    const result = await apiRequest(mockUrl);

    expect(result).toEqual(mockResponse);
  });

  it('should handle 401 unauthorized response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      json: jest.fn(),
    });

    await expect(apiRequest(mockUrl)).rejects.toThrow('Unauthorized - Token expired');

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('authToken');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('user');
  });

  it('should handle other HTTP errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      json: jest.fn(),
    });

    await expect(apiRequest(mockUrl)).rejects.toThrow('HTTP error! status: 404');
  });

  it('should handle network errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(apiRequest(mockUrl)).rejects.toThrow('Network error - Please check your connection');
  });

  it('should pass through other errors', async () => {
    const error = new Error('Custom error');
    (global.fetch as jest.Mock).mockRejectedValue(error);

    await expect(apiRequest(mockUrl)).rejects.toThrow(error);
  });

  it('should merge custom config with default headers', async () => {
    const customConfig = {
      method: 'POST',
      body: JSON.stringify({ test: 'data' }),
      headers: {
        'Custom-Header': 'custom-value',
      },
    };

    await apiRequest(mockUrl, customConfig);

    const callArgs = (global.fetch as jest.Mock).mock.calls[0];
    const config = callArgs[1];

    expect(config.method).toBe('POST');
    expect(config.body).toBe(JSON.stringify({ test: 'data' }));

    const headers = config.headers as Headers;
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('Custom-Header')).toBe('custom-value');
  });
});

describe('isTokenLikelyExpired', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return true when no token exists', () => {
    localStorageMock.getItem.mockReturnValue(null);

    expect(isTokenLikelyExpired()).toBe(true);
  });

  it('should return true when token is invalid JWT', () => {
    localStorageMock.getItem.mockReturnValue('invalid-token');

    expect(isTokenLikelyExpired()).toBe(true);
  });

  it('should return true when token is expired', () => {
    const expiredPayload = { exp: Math.floor(Date.now() / 1000) - 100 };
    const expiredToken = `header.${btoa(JSON.stringify(expiredPayload))}.signature`;

    localStorageMock.getItem.mockReturnValue(expiredToken);

    expect(isTokenLikelyExpired()).toBe(true);
  });

  it('should return true when token expires within 30 seconds', () => {
    const soonExpiringPayload = { exp: Math.floor(Date.now() / 1000) + 10 };
    const soonExpiringToken = `header.${btoa(JSON.stringify(soonExpiringPayload))}.signature`;

    localStorageMock.getItem.mockReturnValue(soonExpiringToken);

    expect(isTokenLikelyExpired()).toBe(true);
  });

  it('should return false when token is valid and not expiring soon', () => {
    const validPayload = { exp: Math.floor(Date.now() / 1000) + 3600 }; // Expires in 1 hour
    const validToken = `header.${btoa(JSON.stringify(validPayload))}.signature`;

    localStorageMock.getItem.mockReturnValue(validToken);

    expect(isTokenLikelyExpired()).toBe(false);
  });

  it('should return true when token has no exp claim', () => {
    const noExpPayload = { iat: Math.floor(Date.now() / 1000) };
    const noExpToken = `header.${btoa(JSON.stringify(noExpPayload))}.signature`;

    localStorageMock.getItem.mockReturnValue(noExpToken);

    expect(isTokenLikelyExpired()).toBe(true);
  });
});