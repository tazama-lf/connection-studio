/**
 * Token utility functions for JWT handling
 */

export interface TokenInfo {
  isExpired: boolean;
  expiresAt: Date | null;
  timeUntilExpiry: number; // in seconds
  willExpireSoon: boolean; // true if expires in less than 5 minutes
}

/**
 * Decode a JWT token and extract expiration information
 */
export function getTokenInfo(token: string): TokenInfo {
  try {
    // Decode JWT (format: header.payload.signature)
    const parts = token.split('.');
    if (parts.length !== 3) {
      return {
        isExpired: true,
        expiresAt: null,
        timeUntilExpiry: 0,
        willExpireSoon: false,
      };
    }

    // Decode the payload (base64)
    const payload = JSON.parse(atob(parts[1]));
    
    if (!payload.exp) {
      // No expiration claim
      return {
        isExpired: false,
        expiresAt: null,
        timeUntilExpiry: Infinity,
        willExpireSoon: false,
      };
    }

    // JWT exp is in seconds since epoch
    const expiresAt = new Date(payload.exp * 1000);
    const now = new Date();
    const timeUntilExpiry = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);
    
    const isExpired = timeUntilExpiry <= 0;
    const willExpireSoon = timeUntilExpiry > 0 && timeUntilExpiry <= 300; // 5 minutes

    return {
      isExpired,
      expiresAt,
      timeUntilExpiry,
      willExpireSoon,
    };
  } catch (error) {
    console.error('Error decoding token:', error);
    return {
      isExpired: true,
      expiresAt: null,
      timeUntilExpiry: 0,
      willExpireSoon: false,
    };
  }
}

/**
 * Format time remaining in a human-readable way
 */
export function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return 'Expired';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }
  
  return `${minutes}m ${remainingSeconds}s`;
}
