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

  // Check if user is already logged in (from localStorage)
  useEffect(() => {
    const initializeAuth = () => {
      const storedToken = localStorage.getItem('authToken');
      const storedUser = localStorage.getItem('user');
      
      if (storedToken && storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setIsAuthenticated(true);
        } catch (error) {
          console.warn('Failed to parse stored user data, removing from localStorage');
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  // Register with global token manager for token expiration handling
  useEffect(() => {
    const tokenHandler = {
      onTokenExpired: () => {
        console.log('Token expired, showing modal and logging out');
        setShowTokenExpiredModal(true);
        setUser(null);
        setIsAuthenticated(false);
      },
      isModalOpen: showTokenExpiredModal
    };

    const unsubscribe = globalTokenManager.subscribe(tokenHandler);
    return unsubscribe;
  }, [showTokenExpiredModal]);

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
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    
    // Optionally call the logout API endpoint
    authApi.logout().catch(error => {
      console.error('Logout API call failed:', error);
    });
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