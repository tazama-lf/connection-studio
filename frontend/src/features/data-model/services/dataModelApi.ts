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
  value: string; // e.g., "entities.Name"
  label: string; // e.g., "entities.Name"
  collection: string;
  field: string;
  type: TazamaFieldType;
  required: boolean;
  description?: string;
  example?: unknown;
  isExtension?: boolean; // true for custom extensions
  collection_id?: number; // unique identifier for the collection
  parent_id?: number; // unique identifier for the parent field (if nested)
  serial_no?: number; // unique identifier for the option
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
      // Clear expired tokens
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
        errorData.message || `HTTP error! status: ${response.status}`,
      );
    }

    return await response.json();
  }

  /**
   * Get the complete Tazama data model schema
   */
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
      console.error('Error fetching data model schema:', error);
      throw error;
    }
  }

  /**
   * Get all available destination paths for mapping
   */
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
      console.error('Error fetching destination paths:', error);
      throw error;
    }
  }

  /**
   * Get destination options formatted for UI dropdowns (includes base model + extensions)
   */
  async getDestinationOptions(): Promise<
    DataModelApiResponse & { data?: DestinationOption[] }
  > {
    try {
      const response = await fetch(
        `${this.baseURL}/tazama-data-model/destination-options`,
        {
          method: 'GET',
          headers: this.getAuthHeaders(),
        },
      );
      return this.handleResponse<
        DataModelApiResponse & { data?: DestinationOption[] }
      >(response);
    } catch (error) {
      console.error('Error fetching destination options:', error);
      throw error;
    }
  }

  /**
   * Get all data model extensions for the tenant
   */
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
      console.error('Error fetching data model extensions:', error);
      throw error;
    }
  }

  /**
   * Get extensions for a specific collection
   */
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
      console.error('Error fetching extensions by collection:', error);
      throw error;
    }
  }

  /**
   * Get a specific extension by ID
   */
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
      console.error('Error fetching extension by ID:', error);
      throw error;
    }
  }

  /**
   * Create a new data model extension
   */
  async createExtension(
    request: CreateDataModelExtensionRequest,
  ): Promise<DataModelApiResponse<DataModelExtension>> {
    try {
      console.log('🚀 DataModelApi - Creating extension:', request);
      console.log(
        '🚀 DataModelApi - API endpoint:',
        `${this.baseURL}/data-model/extensions`,
      );
      console.log('🚀 DataModelApi - Request headers:', this.getAuthHeaders());

      const response = await fetch(`${this.baseURL}/data-model/extensions`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(request),
      });

      console.log('📡 DataModelApi - Response status:', response.status);
      console.log('📡 DataModelApi - Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ DataModelApi - Error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result =
        await this.handleResponse<DataModelApiResponse<DataModelExtension>>(
          response,
        );
      console.log('✅ DataModelApi - Extension created successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ DataModelApi - Error creating extension:', error);
      throw error;
    }
  }

  /**
   * Update an existing data model extension
   */
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
      console.error('Error updating data model extension:', error);
      throw error;
    }
  }

  /**
   * Delete a data model extension
   */
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
      console.error('Error deleting data model extension:', error);
      throw error;
    }
  }

  /**
   * Validate a destination path
   */
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
      console.error('Error validating destination path:', error);
      throw error;
    }
  }

  /**
   * Create a new destination type (immediate parent/collection)
   */
  async createImmediateParent(request: {
    collection_type: string;
    name: string;
    description: string;
    destination_id: number;
  }): Promise<DataModelApiResponse> {
    try {
      console.log('🚀 DataModelApi - Creating destination type:', request);
      const response = await fetch(
        `${this.baseURL}/tazama-data-model/destination-types`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(request),
        },
      );
      console.log('📡 DataModelApi - Response status:', response.status);
      return this.handleResponse<DataModelApiResponse>(response);
    } catch (error) {
      console.error(
        '❌ DataModelApi - Error creating destination type:',
        error,
      );
      throw error;
    }
  }

  /**
   * Create a new field under a destination type (parent or child)
   */
  async createParentChildDestination(
    destinationTypeId: number,
    request: {
      name: string;
      field_type: string;
      parent_id?: string | number | null;
    },
  ): Promise<DataModelApiResponse> {
    try {
      console.log('🚀 DataModelApi - Creating destination field:', request);
      const response = await fetch(
        `${this.baseURL}/tazama-data-model/destination-types/${destinationTypeId}/fields`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(request),
        },
      );
      console.log('📡 DataModelApi - Response status:', response.status);
      return this.handleResponse<DataModelApiResponse>(response);
    } catch (error) {
      console.error(
        '❌ DataModelApi - Error creating destination field:',
        error,
      );
      throw error;
    }
  }
}

export const dataModelApi = new DataModelApiService();
