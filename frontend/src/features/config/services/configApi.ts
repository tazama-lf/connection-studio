import { API_CONFIG } from '../../../shared/config/api.config';
import type { Config, JsonSchema } from '../index';

// Types for configuration API
export interface CreateConfigRequest {
  msgFam?: string;
  transactionType: string;
  version?: string;
  contentType?: 'application/json' | 'application/xml';
  payload: string;
  schema?: any; // Complete JSON Schema object
  mapping?: FieldMapping[];
  fieldAdjustments?: FieldAdjustment[];
}

export interface CloneConfigRequest {
  sourceConfigId: number;
  newTransactionType: string;
  newVersion?: string;
  newMsgFam?: string;
}

export interface FieldMapping {
  source?: string;
  destination?: string;
  sources?: string[];
  separator?: string;
}

export interface ConfigResponse {
  success: boolean;
  message: string;
  config?: {
    id: number;
    msgFam: string;
    transactionType: string;
    endpointPath: string;
    version: string;
    contentType: string;
    schema: JsonSchema;
    mapping: FieldMapping[];
    status: string;
    tenantId: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  };
  validation?: {
    success: boolean;
    errors: string[];
    warnings: string[];
  };
}

export interface AddMappingRequest {
  source?: string;
  destination?: string;
  sources?: string[];
  destinations?: string[];
  delimiter?: string;
  separator?: string; // Keeping for backward compatibility with concatenate
}

export interface SchemaField {
  name: string;
  path: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  isRequired: boolean;
  children?: SchemaField[];
  arrayElementType?: string;
}

export interface FieldAdjustment {
  path: string;
  type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'OBJECT' | 'ARRAY';
  isRequired: boolean;
}

// Configuration API service
export class ConfigApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_CONFIG.AUTH_BASE_URL; // Using same base URL as auth
  }

  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (response.status === 401) {
      localStorage.removeItem('authToken');
      // In test environment, just return the JSON response instead of redirecting
      if (
        typeof window !== 'undefined' &&
        window.location &&
        !window.location.href.includes('localhost')
      ) {
        window.location.href = '/login';
      }
      // Return the error response for test consistency
      const errorData = await response
        .json()
        .catch(() => ({ success: false, message: 'Unauthorized' }));
      return errorData as T;
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // For validation errors (4xx), return the error response instead of throwing
      if (response.status >= 400 && response.status < 500) {
        return errorData as T;
      }
      // For server errors (5xx), still throw
      throw new Error(
        errorData.message || `HTTP error! status: ${response.status}`,
      );
    }

    return await response.json();
  }

  async createConfig(data: CreateConfigRequest): Promise<ConfigResponse> {
    try {
      console.log('Making API call to:', `${this.baseURL}/config`);
      console.log('Request payload:', data);
      console.log('Request headers:', this.getAuthHeaders());

      const response = await fetch(`${this.baseURL}/config`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      const result = await this.handleResponse<ConfigResponse>(response);
      console.log('Parsed response:', result);
      return result;
    } catch (error) {
      console.error('Config creation failed:', error);
      console.error('Network error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async cloneConfig(data: CloneConfigRequest): Promise<ConfigResponse> {
    try {
      console.log('Cloning config:', data);

      const response = await fetch(`${this.baseURL}/config/clone`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      });

      const result = await this.handleResponse<ConfigResponse>(response);
      console.log('Clone response:', result);
      return result;
    } catch (error) {
      console.error('Config clone failed:', error);
      throw error;
    }
  }

  async createConfigFromFile(
    file: File,
    msgFam: string,
    transactionType: string,
    version: string,
  ): Promise<ConfigResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('msgFam', msgFam);
      formData.append('transactionType', transactionType);
      formData.append('version', version);

      const token = localStorage.getItem('authToken');
      const response = await fetch(`${this.baseURL}/config/upload`, {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      });

      return await this.handleResponse<ConfigResponse>(response);
    } catch (error) {
      console.error('Config file upload failed:', error);
      throw error;
    }
  }

  async getConfig(id: number): Promise<ConfigResponse> {
    try {
      console.log('Fetching config by ID:', id);
      const response = await fetch(`${this.baseURL}/config/${id}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      const result = await this.handleResponse<ConfigResponse>(response);
      console.log('Fetched config:', result);
      return result;
    } catch (error) {
      console.error('Config fetch failed:', error);
      throw error;
    }
  }

  async getAllConfigs(): Promise<{ configs: Config[] }> {
    try {
      console.log('Fetching all configs from:', `${this.baseURL}/config`);
      const response = await fetch(`${this.baseURL}/config`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      const configs = await this.handleResponse<Config[]>(response);
      console.log('Fetched configs:', configs);
      return { configs };
    } catch (error) {
      console.error('Configs fetch failed:', error);
      throw error;
    }
  }

  async getConfigsByTransactionType(
    transactionType: string,
  ): Promise<{ configs: Config[] }> {
    try {
      console.log('Fetching configs by transaction type:', transactionType);
      const response = await fetch(
        `${this.baseURL}/config/transaction/${encodeURIComponent(transactionType)}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders(),
        },
      );

      const configs = await this.handleResponse<Config[]>(response);
      console.log('Fetched configs by transaction type:', configs);
      return { configs };
    } catch (error) {
      console.error('Configs fetch by transaction type failed:', error);
      throw error;
    }
  }

  async getConfigsByEndpoint(
    endpoint?: string,
  ): Promise<{ configs: Config[] }> {
    try {
      const url = endpoint
        ? `${this.baseURL}/config/endpoint?endpoint=${encodeURIComponent(endpoint)}`
        : `${this.baseURL}/config/endpoint`;

      console.log('Fetching configs by endpoint:', url);
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      const configs = await this.handleResponse<Config[]>(response);
      console.log('Fetched configs by endpoint:', configs);
      return { configs };
    } catch (error) {
      console.error('Configs fetch by endpoint failed:', error);
      throw error;
    }
  }

  async addMapping(
    configId: number,
    mapping: AddMappingRequest,
  ): Promise<ConfigResponse> {
    try {
      const response = await fetch(
        `${this.baseURL}/config/${configId}/mapping`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(mapping),
        },
      );

      return await this.handleResponse<ConfigResponse>(response);
    } catch (error) {
      console.error('Mapping creation failed:', error);
      throw error;
    }
  }

  async removeMapping(
    configId: number,
    index: number,
  ): Promise<ConfigResponse> {
    try {
      const response = await fetch(
        `${this.baseURL}/config/${configId}/mapping/${index}`,
        {
          method: 'DELETE',
          headers: this.getAuthHeaders(),
        },
      );

      return await this.handleResponse<ConfigResponse>(response);
    } catch (error) {
      console.error('Mapping removal failed:', error);
      throw error;
    }
  }

  async updateConfig(
    id: number,
    data: Partial<CreateConfigRequest>,
  ): Promise<ConfigResponse> {
    try {
      console.log('🚀 configApi.updateConfig called:');
      console.log('  - Config ID:', id);
      console.log('  - Update data:', JSON.stringify(data, null, 2));
      console.log('  - API URL:', `${this.baseURL}/config/${id}`);
      
      const headers = this.getAuthHeaders();
      console.log('  - Request headers:', headers);

      const response = await fetch(`${this.baseURL}/config/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
      });

      console.log('📨 Response received:');
      console.log('  - Status:', response.status);
      console.log('  - Status text:', response.statusText);
      console.log('  - Response headers:', Object.fromEntries(response.headers.entries()));

      const result = await this.handleResponse<ConfigResponse>(response);
      console.log('✅ Processed response:', result);
      
      return result;
    } catch (error) {
      console.error('💥 Config update failed:', error);
      throw error;
    }
  }

  async deleteConfig(id: number): Promise<void> {
    try {
      const response = await fetch(`${this.baseURL}/config/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      if (response.status === 204) {
        return; // No content response for successful delete
      }

      await this.handleResponse(response);
    } catch (error) {
      console.error('Config deletion failed:', error);
      throw error;
    }
  }
}

export const configApi = new ConfigApiService();
