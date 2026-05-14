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
  schema?: unknown;
  mapping?: FieldMapping[];
  functions?: FunctionDefinition[];
  fieldAdjustments?: FieldAdjustment[];
  related_transaction?: string;
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
  constantValue?: unknown;
  operator?: string;
  prefix?: string;
  type?: string;
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
  constantValue?: unknown;
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

const HTTP_UNAUTHORIZED = 401;
const HTTP_BAD_REQUEST = 400;
const HTTP_SERVER_ERROR = 500;
const HTTP_NO_CONTENT = 204;

export class ConfigApiService {
  private readonly baseURL: string;
  private static readonly HTTP_UNAUTHORIZED = HTTP_UNAUTHORIZED;
  private static readonly HTTP_BAD_REQUEST = HTTP_BAD_REQUEST;
  private static readonly HTTP_SERVER_ERROR = HTTP_SERVER_ERROR;
  private static readonly HTTP_NO_CONTENT = HTTP_NO_CONTENT;

  constructor() {
    this.baseURL = API_CONFIG.AUTH_BASE_URL;
  }

  private static getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private static async handleResponse<T>(response: Response): Promise<T> {
    if (response.status === ConfigApiService.HTTP_UNAUTHORIZED) {
      localStorage.removeItem('authToken');
      const errorData = (await response
        .json()
        .catch(() => ({ success: false, message: 'Invalid credentials' }))) as {
        success: boolean;
        message?: string;
      };
      throw new Error(errorData.message ?? 'Invalid credentials');
    }
    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      if (
        response.status >= ConfigApiService.HTTP_BAD_REQUEST &&
        response.status < ConfigApiService.HTTP_SERVER_ERROR
      ) {
        return errorData as T;
      }
      throw new Error(
        errorData.message ?? `HTTP error! status: ${response.status}`,
      );
    }
    return (await response.json()) as T;
  }

  async createConfig(data: CreateConfigRequest): Promise<ConfigResponse> {
    const response = await fetch(`${this.baseURL}/config`, {
      method: 'POST',
      headers: ConfigApiService.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const result =
      await ConfigApiService.handleResponse<ConfigResponse>(response);
    return result;
  }

  async cloneConfig(data: CloneConfigRequest): Promise<ConfigResponse> {
    const response = await fetch(`${this.baseURL}/config/clone`, {
      method: 'POST',
      headers: ConfigApiService.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    const result =
      await ConfigApiService.handleResponse<ConfigResponse>(response);
    return result;
  }

  async createConfigFromFile(
    file: File,
    msgFam: string,
    transactionType: string,
    version: string,
  ): Promise<ConfigResponse> {
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
    return await ConfigApiService.handleResponse<ConfigResponse>(response);
  }

  async getConfig(id: number): Promise<ConfigResponse> {
    try {
      const response = await fetch(`${this.baseURL}/config/${id}`, {
        method: 'GET',
        headers: ConfigApiService.getAuthHeaders(),
      });
      const result = await ConfigApiService.handleResponse<
        ConfigResponse | { id: number; [key: string]: unknown }
      >(response);
      if (typeof result === 'object' && 'success' in result) {
        return result as ConfigResponse;
      }
      if (typeof result === 'object' && 'id' in result) {
        return {
          success: true,
          config: result as ConfigResponse['config'],
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
    const response = await fetch(`${this.baseURL}/config/0/10`, {
      method: 'POST',
      headers: ConfigApiService.getAuthHeaders(),
      body: JSON.stringify({
        status: 'STATUS_01_IN_PROGRESS',
      }),
    });
    const responseData = await ConfigApiService.handleResponse<
      { success: boolean; configs: Config[] } | Config[]
    >(response);
    let configsArray: Config[] = [];
    if (Array.isArray(responseData)) {
      configsArray = responseData;
    } else if (typeof responseData === 'object' && 'configs' in responseData) {
      configsArray = Array.isArray(responseData.configs)
        ? responseData.configs
        : [];
    }
    const result = { configs: configsArray };
    return result;
  }

  async getConfigsPaginated(
    params: PaginationParams,
    searchingFilters?: Record<string, unknown>,
  ): Promise<PaginatedConfigResponse> {
    const { status, ...otherFilters } = searchingFilters ?? {};
    let statusFilter = '';
    if (!status) {
      const userRole = params.userRole as keyof typeof getDemsStatusLov;
      const lovItems = getDemsStatusLov[userRole];
      statusFilter = lovItems.map((item) => item.value).join(',') || '';
    }

    const res = await fetch(
      `${this.baseURL}/config/${params.offset}/${params.limit}`,
      {
        method: 'POST',
        headers: ConfigApiService.getAuthHeaders(),
        body: JSON.stringify({
          ...otherFilters,
          status: status ?? statusFilter,
        }),
      },
    );
    if (!res.ok) {
      throw new Error('Failed to fetch paginated configs');
    }
    return (await res.json()) as PaginatedConfigResponse;
  }

  async getPendingApprovals(): Promise<{ configs: Config[] }> {
    const headers = ConfigApiService.getAuthHeaders();
    const response = await fetch(
      `${this.baseURL}/config/pending-approvals/10/0`,
      {
        method: 'POST',
        headers,
      },
    );
    const responseData = await ConfigApiService.handleResponse<
      { success: boolean; configs: Config[] } | Config[]
    >(response);
    if (typeof responseData === 'object' && 'configs' in responseData) {
      return {
        configs: Array.isArray(responseData.configs)
          ? responseData.configs
          : [],
      };
    } else if (Array.isArray(responseData)) {
      return { configs: responseData };
    } else {
      return { configs: [] };
    }
  }

  async getConfigsByTransactionType(
    transactionType: string,
  ): Promise<{ configs: Config[] }> {
    const response = await fetch(
      `${this.baseURL}/config/transaction/${encodeURIComponent(transactionType)}`,
      {
        method: 'GET',
        headers: ConfigApiService.getAuthHeaders(),
      },
    );
    const configs = await ConfigApiService.handleResponse<Config[]>(response);
    return { configs };
  }

  async getConfigsByEndpoint(
    endpoint?: string,
  ): Promise<{ configs: Config[] }> {
    const url = endpoint
      ? `${this.baseURL}/config/endpoint?endpoint=${encodeURIComponent(endpoint)}`
      : `${this.baseURL}/config/endpoint`;
    const response = await fetch(url, {
      method: 'GET',
      headers: ConfigApiService.getAuthHeaders(),
    });
    const configs = await ConfigApiService.handleResponse<Config[]>(response);
    return { configs };
  }

  async addMapping(
    configId: number,
    mapping: AddMappingRequest,
  ): Promise<ConfigResponse> {
    const response = await fetch(`${this.baseURL}/config/${configId}/mapping`, {
      method: 'POST',
      headers: ConfigApiService.getAuthHeaders(),
      body: JSON.stringify(mapping),
    });
    return await ConfigApiService.handleResponse<ConfigResponse>(response);
  }

  async removeMapping(
    configId: number,
    index: number,
  ): Promise<ConfigResponse> {
    const response = await fetch(
      `${this.baseURL}/config/${configId}/mapping/${index}`,
      {
        method: 'DELETE',
        headers: ConfigApiService.getAuthHeaders(),
      },
    );
    return await ConfigApiService.handleResponse<ConfigResponse>(response);
  }

  async updateConfig(
    id: number,
    data: Partial<CreateConfigRequest>,
  ): Promise<ConfigResponse> {
    const headers = ConfigApiService.getAuthHeaders();
    const response = await fetch(`${this.baseURL}/config/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    const result =
      await ConfigApiService.handleResponse<ConfigResponse>(response);
    return result;
  }

  async updateConfigStatus(
    id: number,
    status: string,
  ): Promise<ConfigResponse> {
    const url = `${this.baseURL}/config/update/status/${id}?status=${status}`;
    const headers = ConfigApiService.getAuthHeaders();
    const method = 'PATCH';
    const response = await fetch(url, {
      method,
      headers,
    });
    const result =
      await ConfigApiService.handleResponse<ConfigResponse>(response);
    return result;
  }

  async updatePublishingStatus(
    id: number,
    publishingStatus: 'active' | 'inactive',
  ): Promise<ConfigResponse> {
    const url = `${this.baseURL}/config/${id}/publishing-status`;
    const headers = ConfigApiService.getAuthHeaders();
    const method = 'PATCH';
    const response = await fetch(url, {
      method,
      headers,
      body: JSON.stringify({
        publishing_status: publishingStatus,
      }),
    });
    const result =
      await ConfigApiService.handleResponse<ConfigResponse>(response);
    return result;
  }

  async deleteConfig(id: number): Promise<void> {
    const response = await fetch(`${this.baseURL}/config/${id}`, {
      method: 'DELETE',
      headers: ConfigApiService.getAuthHeaders(),
    });
    if (response.status === ConfigApiService.HTTP_NO_CONTENT) {
      return;
    }
    await ConfigApiService.handleResponse(response);
  }

  async updateWorkflow(
    id: number,
    action: 'submit' | 'approve' | 'reject' | 'deploy' | 'export',
    payload?: Record<string, unknown>,
  ): Promise<ConfigResponse> {
    const url = `${this.baseURL}/config/${id}/workflow?action=${action}`;
    const headers = ConfigApiService.getAuthHeaders();
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload ?? {}),
    });
    const result =
      await ConfigApiService.handleResponse<ConfigResponse>(response);
    return result;
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
      comment: reason ?? 'Configuration rejected by approver',
    });
  }

  async exportConfig(id: number, notes?: string): Promise<ConfigResponse> {
    return await this.updateWorkflow(id, 'export', {
      comment: notes ?? 'Exported for deployment',
      userId: 'system',
      userRole: 'exporter',
    });
  }

  async deployConfig(id: number, notes?: string): Promise<ConfigResponse> {
    return await this.updateWorkflow(id, 'deploy', {
      notes: notes ?? 'Deployed to production',
      actionBy: 'publisher',
    });
  }

  async getWorkflowStatus(
    id: number,
  ): Promise<{ status: string; message?: string }> {
    const response = await fetch(
      `${this.baseURL}/config/${id}/workflow/status`,
      {
        method: 'GET',
        headers: ConfigApiService.getAuthHeaders(),
      },
    );
    return await ConfigApiService.handleResponse<{
      status: string;
      message?: string;
    }>(response);
  }

  async returnToProgress(id: number): Promise<ConfigResponse> {
    const response = await fetch(
      `${this.baseURL}/config/${id}/workflow/return-to-progress`,
      {
        method: 'POST',
        headers: ConfigApiService.getAuthHeaders(),
      },
    );
    return await ConfigApiService.handleResponse<ConfigResponse>(response);
  }

  async requestChanges(
    id: number,
    requestedChanges: string,
  ): Promise<ConfigResponse> {
    const response = await fetch(
      `${this.baseURL}/config/${id}/workflow/request-changes`,
      {
        method: 'POST',
        headers: ConfigApiService.getAuthHeaders(),
        body: JSON.stringify({ requestedChanges }),
      },
    );
    return await ConfigApiService.handleResponse<ConfigResponse>(response);
  }

  async updateStatusToExported(
    id: number,
    comment?: string,
  ): Promise<ConfigResponse> {
    const requestBody = {
      comment: comment ?? 'Status updated to exported',
      userId: 'system',
    };
    const response = await fetch(
      `${this.baseURL}/config/${id}/update-status-to-exported`,
      {
        method: 'POST',
        headers: ConfigApiService.getAuthHeaders(),
        body: JSON.stringify(requestBody),
      },
    );
    const result =
      await ConfigApiService.handleResponse<ConfigResponse>(response);
    return result;
  }

  async getRelatedTransactions(): Promise<{
    success: boolean;
    data: string[];
  }> {
    const response = await fetch(
      `${this.baseURL}/config/tcs/related-transactions`,
      {
        method: 'GET',
        headers: ConfigApiService.getAuthHeaders(),
      },
    );
    return await ConfigApiService.handleResponse<{
      success: boolean;
      data: string[];
    }>(response);
  }

  async getConfigsByStatus(
    status: 'approved' | 'exported',
  ): Promise<{ configs: Config[] }> {
    const response = await fetch(`${this.baseURL}/config`, {
      method: 'GET',
      headers: ConfigApiService.getAuthHeaders(),
    });
    const responseData = await ConfigApiService.handleResponse<
      { success: boolean; configs: Config[] } | Config[]
    >(response);
    let configsArray: Config[] = [];
    if (Array.isArray(responseData)) {
      configsArray = responseData;
    } else if (typeof responseData === 'object' && 'configs' in responseData) {
      configsArray = Array.isArray(responseData.configs)
        ? responseData.configs
        : [];
    }
    const filteredConfigs = configsArray.filter((config) => {
      const configStatus = config.status.toLowerCase() || '';
      const targetStatus = status.toLowerCase();
      if (targetStatus === 'approved') {
        return (
          configStatus === 'approved' ||
          configStatus === 'status_04_approved' ||
          configStatus.includes('approved')
        );
      } else if (targetStatus === 'exported') {
        return (
          configStatus === 'exported' ||
          configStatus === 'status_06_exported' ||
          configStatus.includes('exported')
        );
      } else {
        return configStatus === targetStatus;
      }
    });
    const result = { configs: filteredConfigs };
    return result;
  }
}

export const configApi = new ConfigApiService();
