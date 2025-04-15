import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/auth-context-provider';

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