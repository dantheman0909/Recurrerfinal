import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'wouter';

// User type definition
export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'team_lead' | 'csm';
  team_lead_id?: number | null;
}

// Auth context type definition
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
}

// Create the auth context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => false,
  logout: async () => {},
  checkAuth: async () => false,
});

// Auth provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();
  
  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, []);
  
  // Login function
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // In the future, implement actual login API call
      // For now, simulate successful login
      setIsAuthenticated(true);
      setUser({
        id: 1,
        name: 'Test User',
        email: email,
        role: 'csm',
      });
      sessionStorage.setItem('isLoggedIn', 'true');
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };
  
  // Logout function
  const logout = async (): Promise<void> => {
    try {
      // Call logout API
      await fetch('/api/auth/logout');
      
      // Clear auth state
      setUser(null);
      setIsAuthenticated(false);
      sessionStorage.removeItem('isLoggedIn');
      
      // Redirect to login page
      setLocation('/auth/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };
  
  // Check if user is authenticated
  const checkAuth = async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Get current user info from API
      const response = await fetch('/api/me');
      const data = await response.json();
      
      if (data.authenticated && data.user) {
        setUser(data.user);
        setIsAuthenticated(true);
        sessionStorage.setItem('isLoggedIn', 'true');
        setIsLoading(false);
        return true;
      } else {
        setUser(null);
        setIsAuthenticated(false);
        sessionStorage.removeItem('isLoggedIn');
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      console.error('Authentication check failed:', error);
      setUser(null);
      setIsAuthenticated(false);
      sessionStorage.removeItem('isLoggedIn');
      setIsLoading(false);
      return false;
    }
  };
  
  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoading,
      login, 
      logout,
      checkAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);