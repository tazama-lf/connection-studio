import { API_CONFIG } from '../../../shared/config/api.config';
import type {
  AddFunctionDto,
  FunctionResponseDto,
} from '../../../shared/types/functions.types';
import type { Config } from '../../config';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

/**
 * Add a function to a configuration
 */
export async function addFunction(
  configId: number,
  functionData: AddFunctionDto,
): Promise<FunctionResponseDto> {
  const url = `${API_CONFIG.API_BASE_URL}${API_CONFIG.ENDPOINTS.CONFIG.ADD_FUNCTION.replace(':id', configId.toString())}`;
  const headers = getAuthHeaders();
  const body = JSON.stringify(functionData);

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `HTTP error! status: ${response.status}, body: ${errorText}`,
    );
  }

  return (await response.json()) as FunctionResponseDto;
}

/**
 * Update a function in a configuration
 */
export async function updateFunction(
  configId: number,
  functionIndex: number,
  functionData: AddFunctionDto,
): Promise<FunctionResponseDto> {
  const url = `${API_CONFIG.API_BASE_URL}${API_CONFIG.ENDPOINTS.CONFIG.UPDATE_FUNCTION.replace(
    ':id',
    configId.toString(),
  ).replace(':index', functionIndex.toString())}`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(functionData),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return (await response.json()) as FunctionResponseDto;
}

/**
 * Delete a function from a configuration
 */
export async function deleteFunction(
  configId: number,
  functionIndex: number,
): Promise<FunctionResponseDto> {
  const url = `${API_CONFIG.API_BASE_URL}${API_CONFIG.ENDPOINTS.CONFIG.DELETE_FUNCTION.replace(
    ':id',
    configId.toString(),
  ).replace(':index', functionIndex.toString())}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return (await response.json()) as FunctionResponseDto;
}

/**
 * Get configuration with functions
 */
export async function getConfigWithFunctions(
  configId: number,
): Promise<Config> {
  const url = `${API_CONFIG.API_BASE_URL}${API_CONFIG.ENDPOINTS.CONFIG.GET_BY_ID.replace(':id', configId.toString())}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return (await response.json()) as Config;
}
