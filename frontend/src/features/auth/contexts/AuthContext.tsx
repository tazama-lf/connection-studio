import React, { useEffect, useState, createContext, useContext } from 'react';
import { authApi, type User } from '../services/authApi';
import { globalTokenManager } from '../../../shared/services/tokenManager';
import { TokenExpirationModal } from '../../../shared/components/TokenExpirationModal';

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

  // Periodic token expiration check for idle users
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
        // Check if token is expired
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        const isTokenExpired = tokenPayload.exp && tokenPayload.exp < currentTime;
        
        if (isTokenExpired) {
          console.log('Token expired during idle check, triggering logout');
          globalTokenManager.handleTokenExpiration();
        }
      } catch (error) {
        console.error('Error checking token expiration:', error);
        logout();
      }
    };

    // Check every 30 seconds
    const interval = setInterval(checkTokenExpiration, 30000);
    
    return () => clearInterval(interval);
  }, [isAuthenticated]);

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
      
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
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

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      user,
      loading,
      login,
      logout
    }}>
      {children}
      
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