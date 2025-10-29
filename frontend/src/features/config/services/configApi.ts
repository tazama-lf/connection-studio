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
  source?: string | string[];
  destination?: string | string[];
  sources?: string[];
  destinations?: string[];
  separator?: string;
  transformation?: string;
  delimiter?: string;
  constantValue?: any;
  operator?: string;
  prefix?: string;
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
  sumFields?: string[]; // Source fields to sum for mathematical operations
  delimiter?: string;
  separator?: string; // Keeping for backward compatibility with concatenate
  constantValue?: any; // Fixed value to map to destination
  prefix?: string;
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
    console.log('🔍 getAuthHeaders - Token exists:', !!token);
    if (token) {
      console.log(
        '🔍 getAuthHeaders - Token preview:',
        token.substring(0, 50) + '...',
      );
    }
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (response.status === 401) {
      localStorage.removeItem('authToken');
      // For invalid credentials, throw an error instead of redirecting
      const errorData = await response
        .json()
        .catch(() => ({ success: false, message: 'Invalid credentials' }));
      throw new Error(errorData.message || 'Invalid credentials');
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

      const result = await this.handleResponse<any>(response);
      console.log('Raw API response:', result);

      // Check if the response is already in the expected format
      if (result && typeof result === 'object' && 'success' in result) {
        console.log('Response is in expected format:', result);
        return result as ConfigResponse;
      }

      // If the response is the config object directly, wrap it in the expected format
      if (result && typeof result === 'object' && 'id' in result) {
        console.log(
          'Response is raw config object, wrapping in success format',
        );
        return {
          success: true,
          config: result,
          message: 'Config retrieved successfully',
        };
      }

      // If we get here, something unexpected happened
      console.error('Unexpected response format:', result);
      return {
        success: false,
        message: 'Invalid response format from server',
      };
    } catch (error) {
      console.error('Config fetch failed:', error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
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

  async getPendingApprovals(): Promise<{ configs: Config[] }> {
    try {
      console.log(
        '🚀 getPendingApprovals - Fetching pending approvals from:',
        `${this.baseURL}/config/pending-approvals`,
      );
      const headers = this.getAuthHeaders();
      console.log('🚀 getPendingApprovals - Headers:', headers);

      const response = await fetch(`${this.baseURL}/config/pending-approvals`, {
        method: 'GET',
        headers: headers,
      });

      const configs = await this.handleResponse<Config[]>(response);
      console.log('✅ getPendingApprovals - Success:', configs);
      return { configs };
    } catch (error) {
      console.error('❌ getPendingApprovals - Failed:', error);
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
      console.log(
        '  - Response headers:',
        Object.fromEntries(response.headers.entries()),
      );

      const result = await this.handleResponse<ConfigResponse>(response);
      console.log('✅ Processed response:', result);

      return result;
    } catch (error) {
      console.error('💥 Config update failed:', error);
      throw error;
    }
  }

  async updateConfigStatus(
    id: number,
    status: string,
  ): Promise<ConfigResponse> {
    try {
      console.log('🚀 configApi.updateConfigStatus called:');
      console.log('  - Config ID:', id);
      console.log('  - New status:', status);

      const response = await fetch(`${this.baseURL}/config/${id}/status`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ status }),
      });

      const result = await this.handleResponse<ConfigResponse>(response);
      console.log('✅ Config status updated:', result);

      return result;
    } catch (error) {
      console.error('💥 Config status update failed:', error);
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

  // Workflow methods
  async submitForApproval(
    id: number,
    userId: string,
    userRole: string = 'editor',
    comment?: string,
  ): Promise<ConfigResponse> {
    try {
      const response = await fetch(
        `${this.baseURL}/config/${id}/workflow/submit`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({
            configId: id,
            userId,
            userRole,
            comment,
          }),
        },
      );

      return await this.handleResponse<ConfigResponse>(response);
    } catch (error) {
      console.error('Submit for approval failed:', error);
      throw error;
    }
  }

  async approveConfig(id: number): Promise<ConfigResponse> {
    try {
      const response = await fetch(`${this.baseURL}/config/${id}/approve`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ comment: '' }), // Send empty comment to satisfy backend expectations
      });

      return await this.handleResponse<ConfigResponse>(response);
    } catch (error) {
      console.error('Config approval failed:', error);
      throw error;
    }
  }

  async rejectConfig(id: number, reason?: string): Promise<ConfigResponse> {
    try {
      const response = await fetch(`${this.baseURL}/config/${id}/reject`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: reason ? JSON.stringify({ reason }) : undefined,
      });

      return await this.handleResponse<ConfigResponse>(response);
    } catch (error) {
      console.error('Config rejection failed:', error);
      throw error;
    }
  }

  async deployConfig(id: number): Promise<ConfigResponse> {
    try {
      const response = await fetch(
        `${this.baseURL}/config/${id}/workflow/deploy`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
        },
      );

      return await this.handleResponse<ConfigResponse>(response);
    } catch (error) {
      console.error('Config deployment failed:', error);
      throw error;
    }
  }

  async getWorkflowStatus(
    id: number,
  ): Promise<{ status: string; message?: string }> {
    try {
      const response = await fetch(
        `${this.baseURL}/config/${id}/workflow/status`,
        {
          method: 'GET',
          headers: this.getAuthHeaders(),
        },
      );

      return await this.handleResponse<{ status: string; message?: string }>(
        response,
      );
    } catch (error) {
      console.error('Get workflow status failed:', error);
      throw error;
    }
  }

  async returnToProgress(id: number): Promise<ConfigResponse> {
    try {
      const response = await fetch(
        `${this.baseURL}/config/${id}/workflow/return-to-progress`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
        },
      );

      return await this.handleResponse<ConfigResponse>(response);
    } catch (error) {
      console.error('Return to progress failed:', error);
      throw error;
    }
  }

  async requestChanges(
    id: number,
    requestedChanges: string,
  ): Promise<ConfigResponse> {
    try {
      const response = await fetch(
        `${this.baseURL}/config/${id}/workflow/request-changes`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({ requestedChanges }),
        },
      );

      return await this.handleResponse<ConfigResponse>(response);
    } catch (error) {
      console.error('Request changes failed:', error);
      throw error;
    }
  }
}

export const configApi = new ConfigApiService();
