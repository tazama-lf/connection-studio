// Global token expiration handler
export interface TokenExpirationHandler {
  onTokenExpired: () => void;
  isModalOpen: boolean;
}

class GlobalTokenManager {
  private handlers: Set<TokenExpirationHandler> = new Set();
  private isHandlingExpiration = false;

  public subscribe(handler: TokenExpirationHandler): () => void {
    this.handlers.add(handler);

    // Return unsubscribe function
    return () => {
      this.handlers.delete(handler);
    };
  }

  public handleTokenExpiration(): void {
    // Prevent multiple simultaneous token expiration handling
    if (this.isHandlingExpiration) {
      return;
    }

    this.isHandlingExpiration = true;

    // Clear tokens immediately
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');

    // Notify all handlers
    this.handlers.forEach((handler) => {
      try {
        handler.onTokenExpired();
      } catch (error) {
        console.error('Error in token expiration handler:', error);
      }
    });

    // Reset flag after a short delay to prevent rapid successive calls
    setTimeout(() => {
      this.isHandlingExpiration = false;
    }, 1000);
  }

  public isAnyModalOpen(): boolean {
    return Array.from(this.handlers).some((handler) => handler.isModalOpen);
  }
}

// Global singleton instance
export const globalTokenManager = new GlobalTokenManager();

// Enhanced API request function with token expiration handling
export async function apiRequest<T>(
  url: string,
  config: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem('authToken');

  const headers = new Headers(config.headers);
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const response = await fetch(url, {
      ...config,
      headers,
    });

    // Handle token expiration
    if (response.status === 401) {
      globalTokenManager.handleTokenExpiration();
      throw new Error('Unauthorized - Token expired');
    }

    if (!response.ok) {
      // Try to extract error details from response body
      let errorDetails: any;
      try {
        errorDetails = await response.json();
      } catch {
        // If response body is not JSON, create a generic error
        errorDetails = { 
          message: `HTTP error! status: ${response.status}`,
          statusCode: response.status 
        };
      }

      // Create an error object that includes response details
      const error: any = new Error(
        errorDetails.message || 
        errorDetails.error || 
        `HTTP error! status: ${response.status}`
      );
      error.response = {
        status: response.status,
        data: errorDetails,
        headers: Object.fromEntries(response.headers.entries())
      };
      
      throw error;
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      // Check for network errors that might indicate server issues
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error - Please check your connection');
      }
    }
    throw error;
  }
}

// Utility function to check if token is likely expired (client-side validation)
export function isTokenLikelyExpired(): boolean {
  const token = localStorage.getItem('authToken');
  if (!token) return true;

  try {
    // Basic JWT token validation (checking if it's expired)
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;

    // Check if token expires within the next 30 seconds
    return payload.exp && payload.exp < currentTime + 30;
  } catch {
    // If we can't parse the token, consider it expired
    return true;
  }
}
