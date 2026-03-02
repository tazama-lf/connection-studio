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
      
      if (storedToken && storedUser) {
        try {
          // Validate the token by decoding it
          const tokenUserData = authApi.decodeToken(storedToken);
          
          if (tokenUserData) {
            const userData = JSON.parse(storedUser);
            setUser(userData);
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
          }
        } catch (error) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      
      // Clear any existing auth state before login
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      setUser(null);
      setIsAuthenticated(false);
      
      const response = await authApi.login({ username, password });
      
      if (response.token) {
        // Store the token
        localStorage.setItem('authToken', response.token);
        
        // Decode the token to get user information
        const userData = authApi.decodeToken(response.token);
        
        if (userData) {
          setUser(userData);
          setIsAuthenticated(true);
          localStorage.setItem('user', JSON.stringify(userData));
          return true;
        }
      }
      
      return false;
    } catch (error) {
      // Re-throw the error so Login component can catch it and display appropriate message
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
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