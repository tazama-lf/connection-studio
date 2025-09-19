import React, { useEffect, useState, createContext, useContext } from 'react';
interface AuthContextType {
  isAuthenticated: boolean;
  user: {
    name: string;
    role: string;
  } | null;
  login: (userId: string, password: string) => Promise<boolean>;
  logout: () => void;
}
const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  login: async () => false,
  logout: () => {}
});
export const useAuth = () => useContext(AuthContext);
export const AuthProvider: React.FC<{
  children: React.ReactNode;
}> = ({
  children
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{
    name: string;
    role: string;
  } | null>(null);
  // Check if user is already logged in (from localStorage)
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
      } catch (error) {
        console.warn('Failed to parse stored user data, removing from localStorage');
        localStorage.removeItem('user');
      }
    }
  }, []);
  const login = async (userId: string, password: string): Promise<boolean> => {
    // In a real app, this would make an API call to validate credentials
    if (userId && password) {
      // Mock successful login
      const mockUser = {
        name: 'Abdullah Siddiqui',
        role: 'Editor'
      };
      setUser(mockUser);
      setIsAuthenticated(true);
      localStorage.setItem('user', JSON.stringify(mockUser));
      return true;
    }
    return false;
  };
  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('user');
  };
  return <AuthContext.Provider value={{
    isAuthenticated,
    user,
    login,
    logout
  }} data-id="element-1138">
      {children}
    </AuthContext.Provider>;
};