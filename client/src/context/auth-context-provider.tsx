import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from './auth-context';

// Define the AuthContextType
export type AuthContextType = {
  user: User | null;
  loading: boolean;
  authenticated: boolean;
  isAuthenticated: boolean; // Alias for authenticated, for consistency with other hooks
  isLoading: boolean; // Alias for loading, for consistency with other hooks
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  googleLogin: () => void;
  googleSignup: () => void;
  refreshUser: () => Promise<void>; // Function to refresh user data
};

// Create the context with a default value
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProvider props
interface AuthProviderProps {
  children: ReactNode;
}

// AuthProvider component
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authenticated, setAuthenticated] = useState<boolean>(false);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await fetch('/api/me');
        const data = await response.json();

        if (data.authenticated && data.user) {
          setUser(data.user);
          setAuthenticated(true);
        } else {
          setUser(null);
          setAuthenticated(false);
        }
      } catch (error) {
        console.error('Error checking authentication status:', error);
        setUser(null);
        setAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success && data.user) {
        setUser(data.user);
        setAuthenticated(true);
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'An error occurred during login' };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await fetch('/api/me/logout', {
        method: 'POST',
      });
      
      setUser(null);
      setAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear the user state even if the logout request fails
      setUser(null);
      setAuthenticated(false);
    }
  };

  // Register function
  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success && data.user) {
        setUser(data.user);
        setAuthenticated(true);
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Registration failed' };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'An error occurred during registration' };
    }
  };

  // Google login
  const googleLogin = () => {
    window.location.href = '/api/auth/google';
  };

  // Google signup
  const googleSignup = () => {
    window.location.href = '/api/auth/google/signup';
  };

  // Function to refresh user data
  const refreshUser = async () => {
    try {
      const response = await fetch('/api/me');
      const data = await response.json();

      if (data.authenticated && data.user) {
        setUser(data.user);
        setAuthenticated(true);
      } else {
        setUser(null);
        setAuthenticated(false);
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  // Context value
  const value = {
    user,
    loading,
    authenticated,
    isAuthenticated: authenticated, // Alias for authenticated
    isLoading: loading, // Alias for loading
    login,
    logout,
    register,
    googleLogin,
    googleSignup,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};