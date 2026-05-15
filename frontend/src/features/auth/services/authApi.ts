import { API_CONFIG } from '../../../shared/config/api.config';

const HTTP_UNAUTHORIZED = 401;
const HEX_RADIX = 16;
const HEX_PAD_SLICE = -2;
const FIRST_CHAR_INDEX = 0;

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

interface JWTPayload {
  sub?: string;
  clientId?: string;
  preferred_username?: string;
  username?: string;
  email?: string;
  claims?: string[];
  realm_access?: { roles?: string[] };
  tenantId?: string;
  tokenString?: string;
}

export class AuthApiService {
  private readonly authBaseURL: string;
  private readonly defaultHeaders: Record<string, string>;

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
        method: config.method ?? 'GET',
        headers,
        body: config.body ? JSON.stringify(config.body) : undefined,
      });

      if (response.status === HTTP_UNAUTHORIZED) {
        if (endpoint !== API_CONFIG.ENDPOINTS.AUTH.LOGIN) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
        }

        throw new Error('Unauthorized - Token expired');
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error', { cause: error });
      }
      if (
        error instanceof Error &&
        error.message.includes('Cannot read properties of undefined')
      ) {
        throw new Error('Network error', { cause: error });
      }
      throw error;
    }
  }
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return await this.authRequest<AuthResponse>(
      API_CONFIG.ENDPOINTS.AUTH.LOGIN,
      {
        method: 'POST',
        body: credentials,
      },
    );
  }

  async getProfile(): Promise<User> {
    return await this.authRequest<User>(API_CONFIG.ENDPOINTS.AUTH.PROFILE);
  }

  private static decodeBase64Url(base64Url: string): string {
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map(
          (c) =>
            '%' +
            ('00' + c.charCodeAt(FIRST_CHAR_INDEX).toString(HEX_RADIX)).slice(
              HEX_PAD_SLICE,
            ),
        )
        .join(''),
    );
  }

  private static parseInnerToken(payload: JWTPayload): JWTPayload {
    if (!payload.tokenString) return payload;
    try {
      const [, innerBase64Url] = payload.tokenString.split('.');
      if (!innerBase64Url) return payload;
      return JSON.parse(
        AuthApiService.decodeBase64Url(innerBase64Url),
      ) as JWTPayload;
    } catch {
      return payload;
    }
  }

  private static buildUserFromPayload(
    payload: JWTPayload,
    innerPayload: JWTPayload,
  ): User {
    return {
      id: innerPayload.sub ?? payload.sub ?? payload.clientId ?? 'unknown',
      username:
        innerPayload.preferred_username ??
        innerPayload.username ??
        payload.preferred_username ??
        payload.username ??
        innerPayload.sub ??
        payload.sub ??
        'user',
      email: innerPayload.email ?? payload.email,
      claims: payload.claims ?? innerPayload.realm_access?.roles ?? [],
      tenantId: payload.tenantId ?? innerPayload.tenantId,
    };
  }

  static decodeToken(token: string): User | null {
    try {
      const [, base64Url] = token.split('.');
      if (!base64Url) {
        return null;
      }
      const jsonPayload = AuthApiService.decodeBase64Url(base64Url);
      const payload = JSON.parse(jsonPayload) as JWTPayload;
      const innerPayload = AuthApiService.parseInnerToken(payload);
      return AuthApiService.buildUserFromPayload(payload, innerPayload);
    } catch (error) {
      return null;
    }
  }
}

export const authApi = new AuthApiService();
