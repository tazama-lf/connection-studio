import React, { useEffect } from 'react';
import { isTokenLikelyExpired, globalTokenManager } from '../services/tokenManager';

interface TokenCheckProps {
  children: React.ReactNode;
  checkInterval?: number; // milliseconds, default 60000 (1 minute)
}

/**
 * Component that periodically checks for token expiration and proactively handles it
 * This helps catch token expiration before API calls fail
 */
export const TokenExpirationChecker: React.FC<TokenCheckProps> = ({ 
  children, 
  checkInterval = 60000 
}) => {
  useEffect(() => {
    const checkTokenExpiration = () => {
      if (isTokenLikelyExpired()) {
        console.log('Token detected as expired, triggering expiration handling');
        globalTokenManager.handleTokenExpiration();
      }
    };

    // Check immediately on mount
    checkTokenExpiration();

    // Set up periodic checking
    const interval = setInterval(checkTokenExpiration, checkInterval);

    return () => clearInterval(interval);
  }, [checkInterval]);

  return <>{children}</>;
};