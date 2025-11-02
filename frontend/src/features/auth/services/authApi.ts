import { API_CONFIG } from '../../../shared/config/api.config';

// Types for authentication
export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  token: string;
}

export interface User {
  id: string;
  username: string;
  email?: string;
  claims?: string[];
  tenantId?: string;
}

// Authentication API service
export class AuthApiService {
  private authBaseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor() {
    this.authBaseURL = API_CONFIG.AUTH_BASE_URL;
    this.defaultHeaders = API_CONFIG.DEFAULT_HEADERS;
  }

  private async authRequest<T>(
    endpoint: string,
    config: {
      method?: string;
      body?: unknown;
      headers?: Record<string, string>;
    } = {},
  ): Promise<T> {
    const url = `${this.authBaseURL}${endpoint}`;
    const token = localStorage.getItem('authToken');

    const headers = {
      ...this.defaultHeaders,
      ...config.headers,
      ...(token && { Authorization: `Bearer ${token}` }),
    };

    try {
      const response = await fetch(url, {
        method: config.method || 'GET',
        headers,
        body: config.body ? JSON.stringify(config.body) : undefined,
      });

      if (response.status === 401) {
        console.log('=== 401 UNAUTHORIZED RESPONSE ===');
        console.log('URL:', url);
        console.log('Method:', config.method || 'GET');
        console.log('Endpoint:', endpoint);

        // For 401 responses on non-login endpoints, clear tokens
        if (endpoint !== API_CONFIG.ENDPOINTS.AUTH.LOGIN) {
          console.log('Clearing expired tokens');
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
        }
        
        throw new Error('Unauthorized - Token expired');
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Auth API request failed:', error);
      // Re-throw with more specific error messages for common cases
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error');
      }
      if (
        error instanceof Error &&
        error.message.includes('Cannot read properties of undefined')
      ) {
        throw new Error('Network error');
      }
      throw error;
    }
  }
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return this.authRequest<AuthResponse>(API_CONFIG.ENDPOINTS.AUTH.LOGIN, {
      method: 'POST',
      body: credentials,
    });
  }

  // async logout(): Promise<void> {
  //   return this.authRequest<void>(API_CONFIG.ENDPOINTS.AUTH.LOGOUT, {
  //     method: 'POST',
  //   });
  // }

  // async refreshToken(): Promise<AuthResponse> {
  //   return this.authRequest<AuthResponse>(API_CONFIG.ENDPOINTS.AUTH.REFRESH, {
  //     method: 'POST',
  //   });
  // }

  async refreshSession(): Promise<{ success: boolean; message: string }> {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
      throw new Error('No authentication data found');
    }
    
    try {
      const userData = JSON.parse(user);
      const decodedToken = this.decodeToken(token);
      
      if (!decodedToken) {
        throw new Error('Invalid token');
      }
      
      return this.authRequest<{ success: boolean; message: string }>('/auth/session/refresh', {
        method: 'POST',
        body: {
          userId: decodedToken.id || userData.id,
          tenantId: decodedToken.tenantId || userData.tenantId,
          tokenString: token
        },

      });
    } catch (error) {
      console.error('Failed to decode token for session refresh:', error);
      throw error;
    }
  }

  async getProfile(): Promise<User> {
    return this.authRequest<User>(API_CONFIG.ENDPOINTS.AUTH.PROFILE);
  }

  // Helper method to decode JWT token and extract user info
  decodeToken(token: string): User | null {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join(''),
      );

      const payload = JSON.parse(jsonPayload);
      console.log('Decoded JWT payload:', payload); // Debug log

      // If there's a tokenString field, decode that token too
      let innerPayload = payload;
      if (payload.tokenString) {
        try {
          const innerToken = payload.tokenString;
          const innerBase64Url = innerToken.split('.')[1];
          const innerBase64 = innerBase64Url
            .replace(/-/g, '+')
            .replace(/_/g, '/');
          const innerJsonPayload = decodeURIComponent(
            atob(innerBase64)
              .split('')
              .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join(''),
          );
          innerPayload = JSON.parse(innerJsonPayload);
          console.log('Decoded inner JWT payload:', innerPayload);
        } catch (innerError) {
          console.warn(
            'Failed to decode inner token, using outer payload:',
            innerError,
          );
        }
      }

      return {
        id: innerPayload.sub || payload.sub || payload.clientId || 'unknown',
        username:
          innerPayload.preferred_username ||
          innerPayload.username ||
          payload.preferred_username ||
          payload.username ||
          innerPayload.sub ||
          payload.sub ||
          'user',
        email: innerPayload.email || payload.email,
        claims: payload.claims || innerPayload.realm_access?.roles || [],
        tenantId: payload.tenantId || innerPayload.tenantId,
      };
    } catch (error) {
      console.error('Failed to decode token:', error);
      return null;
    }
  }
}

export const authApi = new AuthApiService();
