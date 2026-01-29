import { API_CONFIG } from '../../../shared/config/api.config';
import type {
  AddFunctionDto,
  FunctionResponseDto,
} from '../../../shared/types/functions.types';

export class FunctionsApiService {
  private static getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  /**
   * Add a function to a configuration
   */
  static async addFunction(
    configId: number,
    functionData: AddFunctionDto,
  ): Promise<FunctionResponseDto> {
    try {
      const url = `${API_CONFIG.API_BASE_URL}${API_CONFIG.ENDPOINTS.CONFIG.ADD_FUNCTION.replace(':id', configId.toString())}`;
      const headers = this.getAuthHeaders();
      const body = JSON.stringify(functionData);

      console.log('🌐 FunctionsApiService.addFunction:');
      console.log('URL:', url);
      console.log('Headers:', headers);
      console.log('Body:', body);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ HTTP Error Response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
        throw new Error(
          `HTTP error! status: ${response.status}, body: ${errorText}`,
        );
      }

      const result = await response.json();
      console.log('✅ Success Response:', result);
      return result;
    } catch (error) {
      console.error('Failed to add function:', error);
      throw error;
    }
  }

  /**
   * Update a function in a configuration
   */
  static async updateFunction(
    configId: number,
    functionIndex: number,
    functionData: AddFunctionDto,
  ): Promise<FunctionResponseDto> {
    try {
      const url = `${API_CONFIG.API_BASE_URL}${API_CONFIG.ENDPOINTS.CONFIG.UPDATE_FUNCTION.replace(
        ':id',
        configId.toString(),
      ).replace(':index', functionIndex.toString())}`;

      const response = await fetch(url, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(functionData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to update function:', error);
      throw error;
    }
  }

  /**
   * Delete a function from a configuration
   */
  static async deleteFunction(
    configId: number,
    functionIndex: number,
  ): Promise<FunctionResponseDto> {
    try {
      const url = `${API_CONFIG.API_BASE_URL}${API_CONFIG.ENDPOINTS.CONFIG.DELETE_FUNCTION.replace(
        ':id',
        configId.toString(),
      ).replace(':index', functionIndex.toString())}`;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to delete function:', error);
      throw error;
    }
  }

  /**
   * Get configuration with functions
   */
  static async getConfigWithFunctions(configId: number): Promise<any> {
    try {
      const url = `${API_CONFIG.API_BASE_URL}${API_CONFIG.ENDPOINTS.CONFIG.GET_BY_ID.replace(':id', configId.toString())}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get config with functions:', error);
      throw error;
    }
  }
}

export default FunctionsApiService;
