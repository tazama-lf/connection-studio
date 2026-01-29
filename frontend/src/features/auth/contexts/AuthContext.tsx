import React, { useEffect, useState, createContext, useContext } from 'react';
import { authApi, type User } from '../services/authApi';

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
            const userData = JSON.parse(storedUser);
            console.log('Setting user authenticated:', userData.username);
            setUser(userData);
            setIsAuthenticated(true);
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

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      console.log('Attempting login for username:', username);
      
      // Clear any existing auth state before login
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      setUser(null);
      setIsAuthenticated(false);
      
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
    console.log('=== LOGOUT ===');
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
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
    </AuthContext.Provider>
  );
};

// Export the hook and provider
export { useAuth, AuthProvider };