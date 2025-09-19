import { apiClient } from "../../shared/services/apiClient";
import { API_CONFIG } from "../../../config/api.config";

// Types for authentication
export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
}

export interface User {
  id: string;
  username: string;
  email: string;
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
}

export const authApi = new AuthApiService();
