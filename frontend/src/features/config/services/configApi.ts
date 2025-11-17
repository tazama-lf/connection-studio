import { getDemsStatusLov } from '@shared/lovs';
import { API_CONFIG } from '../../../shared/config/api.config';
import type { Config, JsonSchema } from '../index';

// Types for configuration API
export interface CreateConfigRequest {
  msgFam?: string;
  transactionType: string;
  version?: string;
  contentType?: 'application/json' | 'application/xml';
  payload?: string;
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

interface PaginatedConfigResponse {
  success: boolean;
  configs: Config[];
  total: number;
  limit: number;
  offset: number;
  pages: number;
}

interface PaginationParams {
  limit: number;
  offset: number;
  userRole: string;
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
      const response = await fetch(`${this.baseURL}/config/0/10`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          status:'STATUS_01_IN_PROGRESS',
        }),
      });

      const responseData = await this.handleResponse<{ success: boolean, configs: Config[] } | Config[]>(response);
      console.log('Fetched configs raw response:', responseData);

      // Handle both response formats: {success: true, configs: [...]} or direct array [...]
      let configsArray: Config[] = [];
      if (Array.isArray(responseData)) {
        // Direct array response
        configsArray = responseData;
        console.log('Response is direct array, length:', configsArray.length);
      } else if (responseData && typeof responseData === 'object' && 'configs' in responseData) {
        // Object response with configs property
        configsArray = Array.isArray(responseData.configs) ? responseData.configs : [];
        console.log('Response is object with configs property, length:', configsArray.length);
      }

      const result = { configs: configsArray };
      console.log('Final wrapped response:', result);
      console.log('Final configs count:', result.configs.length);

      return result;
    } catch (error) {
      console.error('Configs fetch failed:', error);
      throw error;
    }
  }

async getConfigsPaginated(
    params: PaginationParams,
    searchingFilters?: Record<any, any>,
  ): Promise<PaginatedConfigResponse> {

    const {status, ...otherFilters} = searchingFilters || {};
    let statusFilter;

    if(!status){
      const userRole = params.userRole as keyof typeof getDemsStatusLov;
      statusFilter = getDemsStatusLov[userRole]?.map(item => item.value)?.join(',') || '';
    }
    
 
    const res = await fetch(`${this.baseURL}/config/${params.offset}/${params.limit}`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        ...otherFilters,
        status: status || statusFilter,
      }),
    });

    if (!res.ok) {
      throw new Error("Failed to fetch paginated configs");
    }

    return (await res.json()) as PaginatedConfigResponse;
  }

  async getPendingApprovals(): Promise<{ configs: Config[] }> {
    try {
      console.log(
        '🚀 getPendingApprovals - Fetching pending approvals from:',
        `${this.baseURL}/config/pending-approvals`,
      );
      const headers = this.getAuthHeaders();
      console.log('🚀 getPendingApprovals - Headers:', headers);

      const response = await fetch(`${this.baseURL}/config/pending-approvals/10/0`, {
        method: 'POST',
        headers: headers,
      });

      console.log('🚀 getPendingApprovals - Raw response status:', response.status);
      console.log('🚀 getPendingApprovals - Raw response ok:', response.ok);

      const responseData = await this.handleResponse<any>(response);
      console.log('✅ getPendingApprovals - Full response data:', responseData);
      console.log('✅ getPendingApprovals - Response type:', typeof responseData);
      console.log('✅ getPendingApprovals - Response has success:', 'success' in responseData);
      console.log('✅ getPendingApprovals - Response has configs:', 'configs' in responseData);

      // Handle the actual response structure from admin service: { success: true, configs: [...] }
      if (responseData && typeof responseData === 'object' && 'configs' in responseData) {
        console.log('✅ getPendingApprovals - Response has configs property, configs length:', responseData.configs?.length);
        return { configs: responseData.configs || [] };
      } else if (Array.isArray(responseData)) {
        console.log('✅ getPendingApprovals - Response is array, returning as is');
        return { configs: responseData };
      } else {
        console.log('✅ getPendingApprovals - Response format unknown, returning empty array');
        return { configs: [] };
      }
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

      const url = `${this.baseURL}/config/update/status/${id}?status=${status}`;
      const headers = this.getAuthHeaders();
      const method = 'PATCH';

      console.log('📤 About to send request:');
      console.log('  - URL:', url);
      console.log('  - Method:', method);
      console.log('  - Headers:', JSON.stringify(headers, null, 2));

      const response = await fetch(url, {
        method: method,
        headers: headers,
      });

      console.log('📥 Response received:');
      console.log('  - Status:', response.status);
      console.log('  - Status Text:', response.statusText);
      console.log('  - URL:', response.url);
      console.log('  - Redirected:', response.redirected);

      const result = await this.handleResponse<ConfigResponse>(response);
      console.log('✅ Config status updated:', result);

      return result;
    } catch (error) {
      console.error('💥 Config status update failed:', error);
      console.error('💥 Full error object:', JSON.stringify(error, null, 2));
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

  async rejectConfig(id: number, userId: string, reason?: string): Promise<ConfigResponse> {
    try {
      const response = await fetch(`${this.baseURL}/config/${id}/reject`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
         userId: userId,
        
          rejectionReason: reason || 'Configuration rejected by approver',
        }),
      });

      const result = await this.handleResponse<ConfigResponse>(response);
      return result;
    } catch (error) {
      console.error('Config rejection failed:', error);
      throw error;
    }
  }

  async deployConfig(id: number, notes?: string): Promise<ConfigResponse> {
    try {
      const response = await fetch(
        `${this.baseURL}/config/${id}/workflow/deploy`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({
            notes: notes || 'Deployed to production',
            actionBy: 'publisher'
          }),
        },
      );

      return await this.handleResponse<ConfigResponse>(response);
    } catch (error) {
      console.error('Deploy config failed:', error);
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

  // Export config (approver -> exporter workflow)
  async updateStatusToExported(id: number, comment?: string): Promise<ConfigResponse> {
    try {
      console.log(`🚀 Updating status to EXPORTED for config ID: ${id}`);
      console.log(`📋 Comment: "${comment || 'Status updated to exported'}"`);
      console.log(`🔗 API endpoint: ${this.baseURL}/config/${id}/update-status-to-exported`);

      const requestBody = {
        comment: comment || 'Status updated to exported',
        userId: 'system', // Backend extracts real user from JWT
      };
      console.log('📤 Request body:', requestBody);

      const response = await fetch(
        `${this.baseURL}/config/${id}/update-status-to-exported`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(requestBody),
        },
      );

      console.log(`📡 Response status: ${response.status} ${response.statusText}`);

      const result = await this.handleResponse<ConfigResponse>(response);
      console.log(`✅ Status update successful for config ${id}:`, result);
      return result;
    } catch (error) {
      console.error(`❌ Status update failed for ID ${id}:`, error);
      throw error;
    }
  }

  async exportConfig(id: number, notes?: string): Promise<ConfigResponse> {
    try {
      console.log(`🚀 Starting export for config ID: ${id}`);
      console.log(`📋 Export notes: "${notes || 'Exported for deployment'}"`);
      console.log(`🔗 Export endpoint: ${this.baseURL}/config/${id}/workflow/export`);

      const requestBody = {
        comment: notes || 'Exported for deployment',
        userId: 'system', // Backend extracts real user from JWT
        userRole: 'exporter' // Backend validates role from JWT claims
      };
      console.log('📤 Request body:', requestBody);

      const response = await fetch(
        `${this.baseURL}/config/${id}/workflow/export`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(requestBody),
        },
      );

      console.log(`📡 Response status: ${response.status} ${response.statusText}`);
      console.log(`📡 Response headers:`, Object.fromEntries(response.headers.entries()));

      const result = await this.handleResponse<ConfigResponse>(response);
      console.log(`✅ Export successful for config ${id}:`, result);
      return result;
    } catch (error) {
      console.error(`❌ Export config failed for ID ${id}:`, error);
      throw error;
    }
  }



  // Get configs by status for different workflows
  async getConfigsByStatus(status: 'approved' | 'exported'): Promise<{ configs: Config[] }> {
    try {
      console.log(`Fetching configs with status: ${status}`);
      // Fetch all configs since backend doesn't support status filtering via query params
      const response = await fetch(`${this.baseURL}/config`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      const responseData = await this.handleResponse<{ success: boolean, configs: Config[] } | Config[]>(response);
      console.log(`Fetched all configs for ${status} filtering:`, responseData);

      // Handle both response formats: {success: true, configs: [...]} or direct array [...]
      let configsArray: Config[] = [];
      if (Array.isArray(responseData)) {
        configsArray = responseData;
      } else if (responseData && typeof responseData === 'object' && 'configs' in responseData) {
        configsArray = Array.isArray(responseData.configs) ? responseData.configs : [];
      }

      // Filter by status on frontend
      console.log(`🔍 All configs before filtering:`, configsArray.map(c => ({ id: c.id, status: c.status })));

      const filteredConfigs = configsArray.filter(config => {
        const configStatus = config.status?.toLowerCase() || '';
        const targetStatus = status.toLowerCase();

        let matches = false;
        // Handle both formats: 'approved' and 'STATUS_04_APPROVED'
        if (targetStatus === 'approved') {
          matches = configStatus === 'approved' ||
            configStatus === 'status_04_approved' ||
            configStatus.includes('approved');
        } else if (targetStatus === 'exported') {
          matches = configStatus === 'exported' ||
            configStatus === 'status_06_exported' ||
            configStatus.includes('exported');
        } else {
          matches = configStatus === targetStatus;
        }

        if (matches) {
          console.log(`✅ Config ${config.id} matches ${targetStatus}: ${config.status}`);
        }

        return matches;
      });

      console.log(`🔍 Filtered configs for ${status}:`, filteredConfigs.map(c => ({ id: c.id, status: c.status })));

      const result = { configs: filteredConfigs };
      console.log(`Final ${status} configs:`, result.configs.length);

      return result;
    } catch (error) {
      console.error(`Failed to fetch ${status} configs:`, error);
      throw error;
    }
  }
}

export const configApi = new ConfigApiService();
