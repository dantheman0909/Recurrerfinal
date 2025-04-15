import React, { useContext } from 'react';
import { Redirect } from 'wouter';
import { usePermissions } from '@/hooks/use-permissions';
import { Spinner } from '@/components/ui/spinner';
import { createContext } from 'react';
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

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
  requiredPermissions?: string[];
  requireAnyPermission?: string[];
  adminOnly?: boolean;
  teamLeadOrAdminOnly?: boolean;
  redirectTo?: string;
}

/**
 * A component that protects routes based on authentication and permissions
 * 
 * @example
 * // Route that requires authentication
 * <ProtectedRoute>
 *   <Dashboard />
 * </ProtectedRoute>
 * 
 * @example
 * // Route that requires a specific permission
 * <ProtectedRoute requiredPermission="view_customers">
 *   <CustomerList />
 * </ProtectedRoute>
 * 
 * @example
 * // Route that requires admin access
 * <ProtectedRoute adminOnly>
 *   <AdminPanel />
 * </ProtectedRoute>
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
  requiredPermissions = [],
  requireAnyPermission = [],
  adminOnly = false,
  teamLeadOrAdminOnly = false,
  redirectTo = '/login',
}) => {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const { 
    hasPermission, 
    hasAllPermissions, 
    hasAnyPermission,
    isLoading: permissionsLoading 
  } = usePermissions();

  // Add single permission to array if provided
  if (requiredPermission) {
    requiredPermissions = [...requiredPermissions, requiredPermission];
  }

  // Show loading spinner while checking authentication or permissions
  if (authLoading || permissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="large" />
      </div>
    );
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <Redirect to={redirectTo} />;
  }

  // Check role-based access
  if (adminOnly && user?.role !== 'admin') {
    return <Redirect to="/unauthorized" />;
  }

  if (teamLeadOrAdminOnly && !['admin', 'team_lead'].includes(user?.role || '')) {
    return <Redirect to="/unauthorized" />;
  }

  // Check permission-based access
  if (requiredPermissions.length > 0 && !hasAllPermissions(requiredPermissions)) {
    return <Redirect to="/unauthorized" />;
  }

  if (requireAnyPermission.length > 0 && !hasAnyPermission(requireAnyPermission)) {
    return <Redirect to="/unauthorized" />;
  }

  // All checks passed, render the protected component
  return <>{children}</>;
};

export default ProtectedRoute;