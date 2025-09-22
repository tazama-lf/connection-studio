import { apiClient } from '../../../shared/services/apiClient';
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
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>(
      API_CONFIG.ENDPOINTS.AUTH.LOGIN,
      credentials,
    );
  }

  async logout(): Promise<void> {
    return apiClient.post<void>(API_CONFIG.ENDPOINTS.AUTH.LOGOUT);
  }

  async refreshToken(): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>(API_CONFIG.ENDPOINTS.AUTH.REFRESH);
  }

  async getProfile(): Promise<User> {
    return apiClient.get<User>(API_CONFIG.ENDPOINTS.AUTH.PROFILE);
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
