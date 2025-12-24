import { getDemsStatusLov } from '@shared/lovs';
import { API_CONFIG } from '../../../shared/config/api.config';
import type { Config, JsonSchema } from '../index';
import type { FunctionDefinition } from '@shared/types/functions.types';

export interface CreateConfigRequest {
  msgFam?: string;
  transactionType: string;
  version?: string;
  contentType?: 'application/json' | 'application/xml';
  payload?: string;
  schema?: any;
  mapping?: FieldMapping[];
  functions?: FunctionDefinition[];
  fieldAdjustments?: FieldAdjustment[];
}

export interface CloneConfigRequest {
  sourceConfigId: number;
  newTransactionType: string;
  newVersion?: string;
  newMsgFam?: string;
}

export interface FieldMapping {
  source?: string | string[]; // string[] for CONCAT/SUM transformations
  destination?: string | string[]; // string[] for SPLIT transformation
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
  statusCode?: number;
}

export interface AddMappingRequest {
  source?: string | string[]; // string[] for CONCAT/SUM transformations
  destination?: string | string[]; // string[] for SPLIT transformation
  delimiter?: string;
  separator?: string;
  constantValue?: any;
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

export class ConfigApiService {
  private readonly baseURL: string;
  constructor() {
    this.baseURL = API_CONFIG.AUTH_BASE_URL;
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
      const errorData = await response
        .json()
        .catch(() => ({ success: false, message: 'Invalid credentials' }));
      throw new Error(errorData.message || 'Invalid credentials');
    }
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status >= 400 && response.status < 500) {
        return errorData as T;
      }
      throw new Error(
        errorData.message || `HTTP error! status: ${response.status}`,
      );
    }
    return await response.json();
  }

  async createConfig(data: CreateConfigRequest): Promise<ConfigResponse> {
    try {
      const response = await fetch(`${this.baseURL}/config`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      });
      const result = await this.handleResponse<ConfigResponse>(response);
      return result;
    } catch (error) {
      throw error;
    }
  }

  async cloneConfig(data: CloneConfigRequest): Promise<ConfigResponse> {
    try {
      const response = await fetch(`${this.baseURL}/config/clone`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      });
      const result = await this.handleResponse<ConfigResponse>(response);
      return result;
    } catch (error) {
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
      throw error;
    }
  }

  async getConfig(id: number): Promise<ConfigResponse> {
    try {
      const response = await fetch(`${this.baseURL}/config/${id}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });
      const result = await this.handleResponse<any>(response);
      if (result && typeof result === 'object' && 'success' in result) {
        return result as ConfigResponse;
      }
      if (result && typeof result === 'object' && 'id' in result) {
        return {
          success: true,
          config: result,
          message: 'Config retrieved successfully',
        };
      }
      return {
        success: false,
        message: 'Invalid response format from server',
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async getAllConfigs(): Promise<{ configs: Config[] }> {
    try {
      const response = await fetch(`${this.baseURL}/config/0/10`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          status: 'STATUS_01_IN_PROGRESS',
        }),
      });
      const responseData = await this.handleResponse<
        { success: boolean; configs: Config[] } | Config[]
      >(response);
      let configsArray: Config[] = [];
      if (Array.isArray(responseData)) {
        configsArray = responseData;
      } else if (
        responseData &&
        typeof responseData === 'object' &&
        'configs' in responseData
      ) {
        configsArray = Array.isArray(responseData.configs)
          ? responseData.configs
          : [];
      }
      const result = { configs: configsArray };
      return result;
    } catch (error) {
      throw error;
    }
  }

  async getConfigsPaginated(
    params: PaginationParams,
    searchingFilters?: Record<any, any>,
  ): Promise<PaginatedConfigResponse> {
    const { status, ...otherFilters } = searchingFilters || {};
    let statusFilter;
    if (!status) {
      const userRole = params.userRole as keyof typeof getDemsStatusLov;
      statusFilter =
        getDemsStatusLov[userRole]?.map((item) => item.value)?.join(',') || '';
    }

    const res = await fetch(
      `${this.baseURL}/config/${params.offset}/${params.limit}`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          ...otherFilters,
          status: status || statusFilter,
        }),
      },
    );
    if (!res.ok) {
      throw new Error('Failed to fetch paginated configs');
    }
    return (await res.json()) as PaginatedConfigResponse;
  }

  async getPendingApprovals(): Promise<{ configs: Config[] }> {
    try {
      const headers = this.getAuthHeaders();
      const response = await fetch(
        `${this.baseURL}/config/pending-approvals/10/0`,
        {
          method: 'POST',
          headers,
        },
      );
      const responseData = await this.handleResponse<any>(response);
      if (
        responseData &&
        typeof responseData === 'object' &&
        'configs' in responseData
      ) {
        return { configs: responseData.configs || [] };
      } else if (Array.isArray(responseData)) {
        return { configs: responseData };
      } else {
        return { configs: [] };
      }
    } catch (error) {
      throw error;
    }
  }

  async getConfigsByTransactionType(
    transactionType: string,
  ): Promise<{ configs: Config[] }> {
    try {
      const response = await fetch(
        `${this.baseURL}/config/transaction/${encodeURIComponent(transactionType)}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders(),
        },
      );
      const configs = await this.handleResponse<Config[]>(response);
      return { configs };
    } catch (error) {
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
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });
      const configs = await this.handleResponse<Config[]>(response);
      return { configs };
    } catch (error) {
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
      throw error;
    }
  }

  async updateConfig(
    id: number,
    data: Partial<CreateConfigRequest>,
  ): Promise<ConfigResponse> {
    try {
      const headers = this.getAuthHeaders();
      const response = await fetch(`${this.baseURL}/config/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
      });
      const result = await this.handleResponse<ConfigResponse>(response);
      return result;
    } catch (error) {
      throw error;
    }
  }

  async updateConfigStatus(
    id: number,
    status: string,
  ): Promise<ConfigResponse> {
    try {
      const url = `${this.baseURL}/config/update/status/${id}?status=${status}`;
      const headers = this.getAuthHeaders();
      const method = 'PATCH';
      const response = await fetch(url, {
        method,
        headers,
      });
      const result = await this.handleResponse<ConfigResponse>(response);
      return result;
    } catch (error) {
      throw error;
    }
  }

  async updatePublishingStatus(
    id: number,
    publishingStatus: 'active' | 'inactive',
  ): Promise<ConfigResponse> {
    try {
      const url = `${this.baseURL}/config/${id}/publishing-status`;
      const headers = this.getAuthHeaders();
      const method = 'PATCH';
      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify({
          publishing_status: publishingStatus,
        }),
      });
      const result = await this.handleResponse<ConfigResponse>(response);
      return result;
    } catch (error) {
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
        return;
      }
      await this.handleResponse(response);
    } catch (error) {
      throw error;
    }
  }

  async updateWorkflow(
    id: number,
    action: 'submit' | 'approve' | 'reject' | 'deploy' | 'export',
    payload?: Record<string, any>,
  ): Promise<ConfigResponse> {
    try {
      const url = `${this.baseURL}/config/${id}/workflow?action=${action}`;
      const headers = this.getAuthHeaders();
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload || {}),
      });
      const result = await this.handleResponse<ConfigResponse>(response);
      return result;
    } catch (error) {
      throw error;
    }
  }

  async submitForApproval(
    id: number,
    userId: string,
    userRole = 'editor',
    comment?: string,
  ): Promise<ConfigResponse> {
    return await this.updateWorkflow(id, 'submit', {
      configId: id,
      userId,
      userRole,
      comment,
    });
  }
  async approveConfig(id: number, comment = ''): Promise<ConfigResponse> {
    return await this.updateWorkflow(id, 'approve', { comment });
  }

  async rejectConfig(
    id: number,
    _userId: string,
    reason?: string,
  ): Promise<ConfigResponse> {
    return await this.updateWorkflow(id, 'reject', {
      comment: reason || 'Configuration rejected by approver',
    });
  }

  async exportConfig(id: number, notes?: string): Promise<ConfigResponse> {
    return await this.updateWorkflow(id, 'export', {
      comment: notes || 'Exported for deployment',
      userId: 'system',
      userRole: 'exporter',
    });
  }

  async deployConfig(id: number, notes?: string): Promise<ConfigResponse> {
    return await this.updateWorkflow(id, 'deploy', {
      notes: notes || 'Deployed to production',
      actionBy: 'publisher',
    });
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
      throw error;
    }
  }

  async updateStatusToExported(
    id: number,
    comment?: string,
  ): Promise<ConfigResponse> {
    try {
      const requestBody = {
        comment: comment || 'Status updated to exported',
        userId: 'system',
      };
      const response = await fetch(
        `${this.baseURL}/config/${id}/update-status-to-exported`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(requestBody),
        },
      );
      const result = await this.handleResponse<ConfigResponse>(response);
      return result;
    } catch (error) {
      throw error;
    }
  }

  async getConfigsByStatus(
    status: 'approved' | 'exported',
  ): Promise<{ configs: Config[] }> {
    try {
      const response = await fetch(`${this.baseURL}/config`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });
      const responseData = await this.handleResponse<
        { success: boolean; configs: Config[] } | Config[]
      >(response);
      let configsArray: Config[] = [];
      if (Array.isArray(responseData)) {
        configsArray = responseData;
      } else if (
        responseData &&
        typeof responseData === 'object' &&
        'configs' in responseData
      ) {
        configsArray = Array.isArray(responseData.configs)
          ? responseData.configs
          : [];
      }
      const filteredConfigs = configsArray.filter((config) => {
        const configStatus = config.status?.toLowerCase() || '';
        const targetStatus = status.toLowerCase();
        let matches = false;
        if (targetStatus === 'approved') {
          matches =
            configStatus === 'approved' ||
            configStatus === 'status_04_approved' ||
            configStatus.includes('approved');
        } else if (targetStatus === 'exported') {
          matches =
            configStatus === 'exported' ||
            configStatus === 'status_06_exported' ||
            configStatus.includes('exported');
        } else {
          matches = configStatus === targetStatus;
        }
        return matches;
      });
      const result = { configs: filteredConfigs };
      return result;
    } catch (error) {
      throw error;
    }
  }
}

export const configApi = new ConfigApiService();
