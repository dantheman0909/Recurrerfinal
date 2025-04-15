import { useQuery } from '@tanstack/react-query';
import { createContext, useContext } from 'react';
import { User } from '@/context/auth-context';

// Define the AuthContextType same as in App.tsx
type AuthContextType = {
  user: User | null;
  loading: boolean;
  authenticated: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  googleLogin: () => void;
  googleSignup: () => void;
  refreshUser: () => Promise<void>;
};

// Create Auth Context - must match the one in App.tsx
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook to use the auth context
const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Hook to check if the current user has a specific permission
 * @returns A hook with functions to check permissions
 */
export const usePermissions = () => {
  const { isAuthenticated, user } = useAuth();

  // Fetch user permissions from the API
  const { data: permissionsData, status } = useQuery({
    queryKey: ['/api/roles/user-permissions'],
    queryFn: async () => {
      if (!isAuthenticated) return { permissions: [] };
      const response = await fetch('/api/roles/user-permissions');
      if (!response.ok) {
        throw new Error('Failed to fetch user permissions');
      }
      return await response.json();
    },
    enabled: isAuthenticated,
  });

  /**
   * Check if the user has a specific permission
   * @param permissionId The permission ID to check
   * @returns Boolean indicating if the user has the permission
   */
  const hasPermission = (permissionId: string): boolean => {
    if (!isAuthenticated || !permissionsData) return false;
    return permissionsData.permissions.includes(permissionId);
  };

  /**
   * Check if the user has all of the specified permissions
   * @param permissionIds Array of permission IDs to check
   * @returns Boolean indicating if the user has all the permissions
   */
  const hasAllPermissions = (permissionIds: string[]): boolean => {
    if (!isAuthenticated || !permissionsData) return false;
    return permissionIds.every(id => permissionsData.permissions.includes(id));
  };

  /**
   * Check if the user has any of the specified permissions
   * @param permissionIds Array of permission IDs to check
   * @returns Boolean indicating if the user has any of the permissions
   */
  const hasAnyPermission = (permissionIds: string[]): boolean => {
    if (!isAuthenticated || !permissionsData) return false;
    return permissionIds.some(id => permissionsData.permissions.includes(id));
  };

  /**
   * Get all permissions the user has
   * @returns Array of permission IDs the user has
   */
  const getAllPermissions = (): string[] => {
    if (!isAuthenticated || !permissionsData) return [];
    return permissionsData.permissions || [];
  };

  return {
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    getAllPermissions,
    isLoading: status === 'pending',
    isError: status === 'error',
  };
};

export default usePermissions;