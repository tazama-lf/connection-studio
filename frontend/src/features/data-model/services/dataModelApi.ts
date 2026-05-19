import { API_CONFIG } from '../../../shared/config/api.config';

const HTTP_UNAUTHORIZED = 401;
const HTTP_CLIENT_ERROR_MIN = 400;
const HTTP_CLIENT_ERROR_MAX = 500;

export type TazamaCollectionName =
  | 'entities'
  | 'accounts'
  | 'account_holder'
  | 'transactionRelationship'
  | 'transactionHistory';

export type TazamaFieldType =
  | 'STRING'
  | 'NUMBER'
  | 'BOOLEAN'
  | 'DATE'
  | 'OBJECT'
  | 'ARRAY';

export interface TazamaField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object';
  required: boolean;
  description?: string;
  example?: unknown;
}

export interface TazamaCollectionSchema {
  name: TazamaCollectionName;
  type: 'node' | 'edge';
  description: string;
  fields: TazamaField[];
}

export interface DestinationOption {
  value: string;
  label: string;
  collection: string;
  field: string;
  type: TazamaFieldType;
  required: boolean;
  description?: string;
  example?: unknown;
  isExtension?: boolean;
  collection_id?: number;
  parent_id?: number;
  serial_no?: number;
}

export interface DataModelExtension {
  id: number;
  collection: TazamaCollectionName;
  fieldName: string;
  fieldType: TazamaFieldType;
  description?: string;
  isRequired: boolean;
  defaultValue?: unknown;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    enum?: unknown[];
  };
  tenantId: string;
  createdBy: string;
  createdAt: Date | string;
  version: number;
}

export interface CreateDataModelExtensionRequest {
  collection: TazamaCollectionName;
  fieldName: string;
  fieldType: TazamaFieldType;
  description?: string;
  isRequired?: boolean;
  defaultValue?: unknown;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    enum?: unknown[];
  };
}

export interface UpdateDataModelExtensionRequest {
  description?: string;
  isRequired?: boolean;
  defaultValue?: unknown;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    enum?: unknown[];
  };
}

export interface DestinationNestedObject {
  [key: string]: DestinationFieldValue;
}

export type DestinationFieldValue =
  | string
  | number
  | boolean
  | null
  | DestinationNestedObject;

export type DestinationCollection = Record<string, DestinationFieldValue>;

export type DestinationFieldsData = Record<string, DestinationCollection>;

export interface DataModelApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  schemas?: TazamaCollectionSchema[];
  paths?: string[];
  options?: DestinationOption[];
  extensions?: DataModelExtension[];
  extension?: DataModelExtension;
  data?: T;
}

class DataModelApiService {
  private readonly baseURL: string;

  constructor() {
    this.baseURL = API_CONFIG.AUTH_BASE_URL;
  }

  private static getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private static async handleResponse<T>(response: Response): Promise<T> {
    if (response.status === HTTP_UNAUTHORIZED) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      const errorData = (await response
        .json()
        .catch(() => ({ success: false, message: 'Unauthorized' }))) as T;
      return errorData;
    }

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      if (
        response.status >= HTTP_CLIENT_ERROR_MIN &&
        response.status < HTTP_CLIENT_ERROR_MAX
      ) {
        return errorData as T;
      }
      throw new Error(
        errorData.message ?? `HTTP error! status: ${response.status}`,
      );
    }

    return (await response.json()) as T;
  }

  async getSchema(): Promise<DataModelApiResponse<TazamaCollectionSchema[]>> {
    const response = await fetch(`${this.baseURL}/data-model/schema`, {
      method: 'GET',
      headers: DataModelApiService.getAuthHeaders(),
    });
    return await DataModelApiService.handleResponse<
      DataModelApiResponse<TazamaCollectionSchema[]>
    >(response);
  }

  async getDestinationPaths(): Promise<DataModelApiResponse<string[]>> {
    const response = await fetch(
      `${this.baseURL}/data-model/destination-paths`,
      {
        method: 'GET',
        headers: DataModelApiService.getAuthHeaders(),
      },
    );
    return await DataModelApiService.handleResponse<
      DataModelApiResponse<string[]>
    >(response);
  }

  async getAllExtensions(): Promise<
    DataModelApiResponse<DataModelExtension[]>
  > {
    const response = await fetch(`${this.baseURL}/data-model/extensions`, {
      method: 'GET',
      headers: DataModelApiService.getAuthHeaders(),
    });
    return await DataModelApiService.handleResponse<
      DataModelApiResponse<DataModelExtension[]>
    >(response);
  }

  async getExtensionsByCollection(
    collection: TazamaCollectionName,
  ): Promise<DataModelApiResponse<DataModelExtension[]>> {
    const response = await fetch(
      `${this.baseURL}/data-model/extensions/collection/${collection}`,
      {
        method: 'GET',
        headers: DataModelApiService.getAuthHeaders(),
      },
    );
    return await DataModelApiService.handleResponse<
      DataModelApiResponse<DataModelExtension[]>
    >(response);
  }

  async getExtensionById(
    id: string,
  ): Promise<DataModelApiResponse<DataModelExtension>> {
    const response = await fetch(
      `${this.baseURL}/data-model/extensions/${id}`,
      {
        method: 'GET',
        headers: DataModelApiService.getAuthHeaders(),
      },
    );
    return await DataModelApiService.handleResponse<
      DataModelApiResponse<DataModelExtension>
    >(response);
  }

  async createExtension(
    request: CreateDataModelExtensionRequest,
  ): Promise<DataModelApiResponse<DataModelExtension>> {
    const response = await fetch(`${this.baseURL}/data-model/extensions`, {
      method: 'POST',
      headers: DataModelApiService.getAuthHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return await DataModelApiService.handleResponse<
      DataModelApiResponse<DataModelExtension>
    >(response);
  }

  async updateExtension(
    id: number,
    request: UpdateDataModelExtensionRequest,
  ): Promise<DataModelApiResponse<DataModelExtension>> {
    const response = await fetch(
      `${this.baseURL}/data-model/extensions/${id}`,
      {
        method: 'PUT',
        headers: DataModelApiService.getAuthHeaders(),
        body: JSON.stringify(request),
      },
    );
    return await DataModelApiService.handleResponse<
      DataModelApiResponse<DataModelExtension>
    >(response);
  }

  async deleteExtension(id: number): Promise<DataModelApiResponse> {
    const response = await fetch(
      `${this.baseURL}/data-model/extensions/${id}`,
      {
        method: 'DELETE',
        headers: DataModelApiService.getAuthHeaders(),
      },
    );
    return await DataModelApiService.handleResponse<DataModelApiResponse>(
      response,
    );
  }

  async validateDestination(
    path: string,
  ): Promise<DataModelApiResponse<{ isValid: boolean; message?: string }>> {
    const response = await fetch(
      `${this.baseURL}/data-model/validate-destination`,
      {
        method: 'POST',
        headers: DataModelApiService.getAuthHeaders(),
        body: JSON.stringify({ path }),
      },
    );
    return await DataModelApiService.handleResponse<
      DataModelApiResponse<{ isValid: boolean; message?: string }>
    >(response);
  }

  async createImmediateParent(request: {
    collection_type: string;
    name: string;
    description: string;
    destination_id: number;
  }): Promise<DataModelApiResponse> {
    const response = await fetch(
      `${this.baseURL}/tazama-data-model/destination-types`,
      {
        method: 'POST',
        headers: DataModelApiService.getAuthHeaders(),
        body: JSON.stringify(request),
      },
    );
    return await DataModelApiService.handleResponse<DataModelApiResponse>(
      response,
    );
  }

  async createParentChildDestination(
    destinationTypeId: number,
    request: {
      name: string;
      field_type: string;
      parent_id?: string | number | null;
    },
  ): Promise<DataModelApiResponse> {
    const response = await fetch(
      `${this.baseURL}/tazama-data-model/destination-types/${destinationTypeId}/fields`,
      {
        method: 'POST',
        headers: DataModelApiService.getAuthHeaders(),
        body: JSON.stringify(request),
      },
    );
    return await DataModelApiService.handleResponse<DataModelApiResponse>(
      response,
    );
  }

  async getDestinationFieldsJson(): Promise<
    DataModelApiResponse & { data?: DestinationFieldsData }
  > {
    const response = await fetch(`${this.baseURL}/tazama-data-model/json`, {
      method: 'GET',
      headers: DataModelApiService.getAuthHeaders(),
    });
    return await DataModelApiService.handleResponse<
      DataModelApiResponse & { data?: DestinationFieldsData }
    >(response);
  }

  async updateDestinationFieldsJson(
    data: DestinationFieldsData,
  ): Promise<DataModelApiResponse> {
    const response = await fetch(`${this.baseURL}/tazama-data-model/json`, {
      method: 'PUT',
      headers: DataModelApiService.getAuthHeaders(),
      body: JSON.stringify({ data_model_json: data }),
    });
    return await DataModelApiService.handleResponse<DataModelApiResponse>(
      response,
    );
  }
}

export const dataModelApi = new DataModelApiService();
