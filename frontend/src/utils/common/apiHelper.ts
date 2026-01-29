/**
 * Common API utility functions for making authenticated HTTP requests
 */

/**
 * Gets authentication headers for API requests
 * @returns Headers with authentication token if available
 */
export const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

/**
 * Makes an authenticated API request with error handling
 * @param url - The API endpoint URL
 * @param options - Fetch request options
 * @returns Parsed JSON response
 * @throws Error if request fails or authentication is invalid
 */
export const apiRequest = async <T>(
  url: string,
  options: RequestInit = {},
): Promise<T> => {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  if (response.status === 401) {
    localStorage.removeItem('authToken');
    throw new Error('Authentication failed');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `HTTP error! status: ${response.status}`,
    );
  }

  return await response.json();
};
