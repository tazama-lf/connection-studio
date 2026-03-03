/**
 * Common API utility functions for making authenticated HTTP requests
 */

const HTTP_STATUS_UNAUTHORIZED = 401;

interface ApiErrorResponse {
  message?: string;
}

/**
 * Gets authentication headers for API requests
 */
export const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('authToken');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

/**
 * Makes an authenticated API request with error handling
 */
export const apiRequest = async <T>(
  url: string,
  options: RequestInit = {},
): Promise<T> => {
  const mergedHeaders: HeadersInit = {
    ...getAuthHeaders(),
    ...(options.headers as Record<string, string> | undefined),
  };

  const response = await fetch(url, {
    ...options,
    headers: mergedHeaders,
  });

  if (response.status === HTTP_STATUS_UNAUTHORIZED) {
    localStorage.removeItem('authToken');
    throw new Error('Authentication failed');
  }

  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;

    try {
      const errorData = (await response.json()) as ApiErrorResponse;
      if (typeof errorData.message === 'string') {
        errorMessage = errorData.message;
      }
    } catch {
      // ignore JSON parse errors
    }

    throw new Error(errorMessage);
  }

  const data: T = (await response.json()) as T;
  return data;
};