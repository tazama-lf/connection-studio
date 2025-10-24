import React, { useEffect, useState, createContext, useContext } from 'react';
import { authApi, type User } from '../services/authApi';
import { globalTokenManager } from '../../../shared/services/tokenManager';
import { TokenExpirationModal } from '../../../shared/components/TokenExpirationModal';
import { TokenExpirationWarning } from '../../../shared/components/TokenExpirationWarning';
import { getTokenInfo, formatTimeRemaining } from '../../../shared/utils/tokenUtils';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  loading: false,
  login: async () => false,
  logout: () => {}
});

function useAuth() {
  return useContext(AuthContext);
}

const AuthProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTokenExpiredModal, setShowTokenExpiredModal] = useState(false);
  const [showTokenExpiringWarning, setShowTokenExpiringWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isIntentionalLogout, setIsIntentionalLogout] = useState(false);

  // Check if user is already logged in (from localStorage)
  useEffect(() => {
    const initializeAuth = () => {
      const storedToken = localStorage.getItem('authToken');
      const storedUser = localStorage.getItem('user');
      
      console.log('=== AUTH INITIALIZATION ===');
      console.log('Stored token exists:', !!storedToken);
      console.log('Stored user exists:', !!storedUser);
      
      if (storedToken && storedUser) {
        try {
          // Validate the token by decoding it
          const tokenUserData = authApi.decodeToken(storedToken);
          console.log('Token validation result:', !!tokenUserData);
          
          if (tokenUserData) {
            // Check if token is expired
            const tokenPayload = JSON.parse(atob(storedToken.split('.')[1]));
            const currentTime = Math.floor(Date.now() / 1000);
            const isTokenExpired = tokenPayload.exp && tokenPayload.exp < currentTime;
            
            console.log('Token expiration check:', {
              exp: tokenPayload.exp,
              current: currentTime,
              expired: isTokenExpired
            });
            
            if (!isTokenExpired) {
              const userData = JSON.parse(storedUser);
              console.log('Setting user authenticated:', userData.username);
              setUser(userData);
              setIsAuthenticated(true);
            } else {
              console.log('Token expired, clearing storage');
              localStorage.removeItem('authToken');
              localStorage.removeItem('user');
            }
          } else {
            console.log('Token invalid, clearing storage');
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
          }
        } catch (error) {
          console.warn('Failed to validate stored auth data, removing from localStorage:', error);
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
        }
      } else {
        console.log('No stored auth data found');
      }
      setLoading(false);
      console.log('=== AUTH INITIALIZATION COMPLETE ===');
    };

    initializeAuth();
  }, []);

  // Register with global token manager for token expiration handling
  useEffect(() => {
    const tokenHandler = {
      onTokenExpired: () => {
        console.log('Token expired event triggered');
        console.log('Is intentional logout:', isIntentionalLogout);
        
        // Don't show modal if this is an intentional logout
        if (!isIntentionalLogout) {
          console.log('Showing token expired modal');
          setShowTokenExpiredModal(true);
        } else {
          console.log('Intentional logout - skipping modal');
        }
        
        setUser(null);
        setIsAuthenticated(false);
      },
      isModalOpen: showTokenExpiredModal
    };

    const unsubscribe = globalTokenManager.subscribe(tokenHandler);
    return unsubscribe;
  }, [showTokenExpiredModal, isIntentionalLogout]);

  // Monitor token expiration and show warning when token will expire soon
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkTokenExpiration = () => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.log('No token found, logging out user');
        logout();
        return;
      }

      try {
        const tokenInfo = getTokenInfo(token);
        
        if (tokenInfo.isExpired) {
          console.log('Token expired, triggering logout');
          globalTokenManager.handleTokenExpiration();
          return;
        }

        // Show warning if token will expire soon (within 5 minutes)
        if (tokenInfo.willExpireSoon && !showTokenExpiringWarning) {
          console.log(`Token will expire in ${tokenInfo.timeUntilExpiry}s, showing warning`);
          setTimeRemaining(formatTimeRemaining(tokenInfo.timeUntilExpiry));
          setShowTokenExpiringWarning(true);
        }

        // Update time remaining if warning is already showing
        if (showTokenExpiringWarning && !tokenInfo.isExpired) {
          setTimeRemaining(formatTimeRemaining(tokenInfo.timeUntilExpiry));
        }
      } catch (error) {
        console.error('Error checking token expiration:', error);
        logout();
      }
    };

    // Check immediately on mount
    checkTokenExpiration();

    // Check every 10 seconds for more responsive warnings
    const interval = setInterval(checkTokenExpiration, 10000);
    
    return () => clearInterval(interval);
  }, [isAuthenticated, showTokenExpiringWarning]);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      console.log('Attempting login for username:', username);
      const response = await authApi.login({ username, password });
      console.log('Login response:', response);
      
      if (response.token) {
        // Store the token
        localStorage.setItem('authToken', response.token);
        console.log('Token stored:', response.token.substring(0, 50) + '...');
        
        // Decode the token to get user information
        const userData = authApi.decodeToken(response.token);
        console.log('Decoded user data:', userData);
        
        if (userData) {
          setUser(userData);
          setIsAuthenticated(true);
          localStorage.setItem('user', JSON.stringify(userData));
          console.log('Final user set in context:', userData);
          return true;
        }
      }
      
      console.log('Login failed: No token in response');
      return false;
    } catch (error) {
      console.error('Login failed with error:', error);
      // Re-throw the error so Login component can catch it and display appropriate message
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    console.log('=== INTENTIONAL LOGOUT ===');
    setIsIntentionalLogout(true); // Set flag to prevent modal
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    
    // Optionally call the logout API endpoint
    authApi.logout().catch(error => {
      console.error('Logout API call failed:', error);
    });
    
    // Reset the flag after a short delay
    setTimeout(() => setIsIntentionalLogout(false), 1000);
  };

  const handleTokenExpiredLoginRedirect = () => {
    setShowTokenExpiredModal(false);
    // Force a page reload to clear any stale state and redirect to login
    window.location.href = '/';
  };

  const handleExtendSession = async () => {
    console.log('=== EXTENDING SESSION ===');
    try {
      // Call the session refresh endpoint to extend the session
      const response = await authApi.refreshSession();
      
      if (response.success) {
        console.log('Session extended successfully');
        setShowTokenExpiringWarning(false);
        // Note: We're not getting a new JWT token, just extending the session
        // User will need to re-login when JWT actually expires
      } else {
        console.error('Failed to extend session:', response);
        // Session could not be extended, user needs to re-login
        logout();
      }
    } catch (error) {
      console.error('Error extending session:', error);
      // If we can't extend, force re-login
      logout();
    }
  };

  const handleLogoutFromWarning = () => {
    setShowTokenExpiringWarning(false);
    logout();
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      user,
      loading,
      login,
      logout
    }}>
      {children}
      
      {/* Token Expiring Soon Warning */}
      <TokenExpirationWarning
        isOpen={showTokenExpiringWarning}
        timeRemaining={timeRemaining}
        onExtendSession={handleExtendSession}
        onLogout={handleLogoutFromWarning}
      />
      
      {/* Token Expiration Modal */}
      <TokenExpirationModal
        isOpen={showTokenExpiredModal}
        onLoginRedirect={handleTokenExpiredLoginRedirect}
      />
    </AuthContext.Provider>
  );
};

// Export the hook and provider
export { useAuth, AuthProvider };