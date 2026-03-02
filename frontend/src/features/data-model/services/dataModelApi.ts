import { API_CONFIG } from '../../../shared/config/api.config';

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
  defaultValue?: any;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    enum?: any[];
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
  defaultValue?: any;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    enum?: any[];
  };
}

export interface UpdateDataModelExtensionRequest {
  description?: string;
  isRequired?: boolean;
  defaultValue?: any;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    enum?: any[];
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
      localStorage.removeItem('user');
      const errorData = await response
        .json()
        .catch(() => ({ success: false, message: 'Unauthorized' }));
      return errorData as T;
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status >= 400 && response.status < 500) {
        return errorData as T;
      }
      throw new Error(
        errorData.message ?? `HTTP error! status: ${response.status}`,
      );
    }

    return await response.json();
  }

  async getSchema(): Promise<DataModelApiResponse<TazamaCollectionSchema[]>> {
    try {
      const response = await fetch(`${this.baseURL}/data-model/schema`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });
      return this.handleResponse<
        DataModelApiResponse<TazamaCollectionSchema[]>
      >(response);
    } catch (error) {
      throw error;
    }
  }
  async getDestinationPaths(): Promise<DataModelApiResponse<string[]>> {
    try {
      const response = await fetch(
        `${this.baseURL}/data-model/destination-paths`,
        {
          method: 'GET',
          headers: this.getAuthHeaders(),
        },
      );
      return this.handleResponse<DataModelApiResponse<string[]>>(response);
    } catch (error) {
      throw error;
    }
  }

  async getAllExtensions(): Promise<
    DataModelApiResponse<DataModelExtension[]>
  > {
    try {
      const response = await fetch(`${this.baseURL}/data-model/extensions`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });
      return this.handleResponse<DataModelApiResponse<DataModelExtension[]>>(
        response,
      );
    } catch (error) {
      throw error;
    }
  }

  async getExtensionsByCollection(
    collection: TazamaCollectionName,
  ): Promise<DataModelApiResponse<DataModelExtension[]>> {
    try {
      const response = await fetch(
        `${this.baseURL}/data-model/extensions/collection/${collection}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders(),
        },
      );
      return this.handleResponse<DataModelApiResponse<DataModelExtension[]>>(
        response,
      );
    } catch (error) {
      throw error;
    }
  }
  async getExtensionById(
    id: string,
  ): Promise<DataModelApiResponse<DataModelExtension>> {
    try {
      const response = await fetch(
        `${this.baseURL}/data-model/extensions/${id}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders(),
        },
      );
      return this.handleResponse<DataModelApiResponse<DataModelExtension>>(
        response,
      );
    } catch (error) {
      throw error;
    }
  }

  async createExtension(
    request: CreateDataModelExtensionRequest,
  ): Promise<DataModelApiResponse<DataModelExtension>> {
    try {

      const response = await fetch(`${this.baseURL}/data-model/extensions`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result =
        await this.handleResponse<DataModelApiResponse<DataModelExtension>>(
          response,
        );
      return result;
    } catch (error) {
      throw error;
    }
  }

  async updateExtension(
    id: number,
    request: UpdateDataModelExtensionRequest,
  ): Promise<DataModelApiResponse<DataModelExtension>> {
    try {
      const response = await fetch(
        `${this.baseURL}/data-model/extensions/${id}`,
        {
          method: 'PUT',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(request),
        },
      );
      return this.handleResponse<DataModelApiResponse<DataModelExtension>>(
        response,
      );
    } catch (error) {
      throw error;
    }
  }

  async deleteExtension(id: number): Promise<DataModelApiResponse> {
    try {
      const response = await fetch(
        `${this.baseURL}/data-model/extensions/${id}`,
        {
          method: 'DELETE',
          headers: this.getAuthHeaders(),
        },
      );
      return this.handleResponse<DataModelApiResponse>(response);
    } catch (error) {
      throw error;
    }
  }

  async validateDestination(
    path: string,
  ): Promise<DataModelApiResponse<{ isValid: boolean; message?: string }>> {
    try {
      const response = await fetch(
        `${this.baseURL}/data-model/validate-destination`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({ path }),
        },
      );
      return this.handleResponse<
        DataModelApiResponse<{ isValid: boolean; message?: string }>
      >(response);
    } catch (error) {
      throw error;
    }
  }

  async createImmediateParent(request: {
    collection_type: string;
    name: string;
    description: string;
    destination_id: number;
  }): Promise<DataModelApiResponse> {
    try {
      const response = await fetch(
        `${this.baseURL}/tazama-data-model/destination-types`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(request),
        },
      );
      return this.handleResponse<DataModelApiResponse>(response);
    } catch (error) {
      throw error;
    }
  }

  async createParentChildDestination(
    destinationTypeId: number,
    request: {
      name: string;
      field_type: string;
      parent_id?: string | number | null;
    },
  ): Promise<DataModelApiResponse> {
    try {
      const response = await fetch(
        `${this.baseURL}/tazama-data-model/destination-types/${destinationTypeId}/fields`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(request),
        },
      );
      return this.handleResponse<DataModelApiResponse>(response);
    } catch (error) {
      throw error;
    }
  }

  async getDestinationFieldsJson(): Promise<
    DataModelApiResponse & { data?: DestinationFieldsData }
  > {
    try {
      const response = await fetch(
        `${this.baseURL}/tazama-data-model/json`,
        {
          method: 'GET',
          headers: this.getAuthHeaders(),
        },
      );
      return await this.handleResponse<
        DataModelApiResponse & { data?: DestinationFieldsData }
      >(response);
    } catch (error) {
      throw error;
    }
  }

  async updateDestinationFieldsJson(
    data: DestinationFieldsData,
  ): Promise<DataModelApiResponse> {
    try {
      const response = await fetch(
        `${this.baseURL}/tazama-data-model/json`,
        {
          method: 'PUT',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({ data_model_json: data }),
        },
      );
      return await this.handleResponse<DataModelApiResponse>(response);
    } catch (error) {
      throw error;
    }
  }
}

export const dataModelApi = new DataModelApiService();
