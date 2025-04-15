import { Route, Switch } from "wouter";
import { useState, useEffect, createContext } from "react";
import NotFound from "@/pages/not-found";
import UnauthorizedPage from "@/pages/unauthorized";
import Dashboard from "@/pages/dashboard";
import Customers from "@/pages/customers";
import CustomerDetails from "@/pages/customer-details";
import ImportDiagnostics from "@/pages/import-diagnostics";
import Tasks from "@/pages/tasks";
import Playbooks from "@/pages/playbooks";
import PlaybookWorkflow from "@/pages/playbooks/workflow";
import Reports from "@/pages/reports";
import RedZone from "@/pages/red-zone";
import RedZoneSettingsEnhanced from "@/pages/redzone-settings-enhanced";
import Admin from "@/pages/admin";
import AdminUsers from "@/pages/admin/users";
import AdminRoles from "@/pages/admin/roles";
import Achievements from "@/pages/achievements";
import Profile from "@/pages/profile";
import Settings from "@/pages/settings";
import GoogleOAuth from "@/pages/settings/google-oauth";
import AppLayout from "@/components/layouts/app-layout";
import { AuthLayout } from "@/components/layouts/auth-layout";
import LoginPage from "@/pages/auth/login";
import SignupPage from "@/pages/auth/signup";
import { useLocation } from "wouter";
import { User } from "@/context/auth-context";
import ProtectedRoute from "@/components/protected-route";

// Define the AuthContextType
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

// Create Auth Context for our app
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// React Router-style navigation
const navigate = (path: string) => {
  window.location.href = path;
  return null;
};

function App() {
  const [location] = useLocation();
  const isAuthRoute = location.startsWith('/auth');
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  
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
  
  // Recreate AuthProvider context values for direct use
  const authContextValue = {
    user,
    loading,
    authenticated,
    isAuthenticated: authenticated,
    isLoading: loading,
    login: async (email: string, password: string) => {
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
    },
    logout: async () => {
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
    },
    register: async (name: string, email: string, password: string) => {
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
    },
    googleLogin: () => {
      window.location.href = '/api/auth/google';
    },
    googleSignup: () => {
      window.location.href = '/api/auth/google/signup';
    },
    refreshUser: async () => {
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
    }
  };
  
  const authRoutes = (
    <AuthLayout title="Recurrer Authentication" description="Sign in to your account">
      <Switch>
        <Route path="/auth/login" component={LoginPage} />
        <Route path="/auth/signup" component={SignupPage} />
        <Route component={() => navigate('/auth/login')} />
      </Switch>
    </AuthLayout>
  );
  
  const appRoutes = (
    <AuthContext.Provider value={authContextValue}>
      <AppLayout>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/unauthorized" component={UnauthorizedPage} />
          
          {/* Customer routes */}
          <Route path="/customers/import/diagnostics">
            <ProtectedRoute requiredPermission="edit_customers">
              <ImportDiagnostics />
            </ProtectedRoute>
          </Route>
          <Route path="/customers">
            <ProtectedRoute requiredPermission="view_customers">
              <Customers />
            </ProtectedRoute>
          </Route>
          <Route path="/customers/:id">
            <ProtectedRoute requiredPermission="view_customers">
              <CustomerDetails />
            </ProtectedRoute>
          </Route>
          
          {/* Task routes */}
          <Route path="/tasks">
            <ProtectedRoute requiredPermission="view_tasks">
              <Tasks />
            </ProtectedRoute>
          </Route>
          
          {/* Playbook routes */}
          <Route path="/playbooks">
            <ProtectedRoute requiredPermission="manage_tasks">
              <Playbooks />
            </ProtectedRoute>
          </Route>
          <Route path="/playbooks/workflow">
            <ProtectedRoute requiredPermission="manage_tasks">
              <PlaybookWorkflow />
            </ProtectedRoute>
          </Route>
          
          {/* Reports route */}
          <Route path="/reports">
            <ProtectedRoute requiredPermission="view_reports">
              <Reports />
            </ProtectedRoute>
          </Route>
          
          {/* Red zone routes */}
          <Route path="/red-zone">
            <ProtectedRoute>
              <RedZone />
            </ProtectedRoute>
          </Route>
          <Route path="/red-zone/settings">
            <ProtectedRoute teamLeadOrAdminOnly>
              <RedZoneSettingsEnhanced />
            </ProtectedRoute>
          </Route>
          
          {/* Admin routes */}
          <Route path="/admin">
            <ProtectedRoute adminOnly>
              <Admin />
            </ProtectedRoute>
          </Route>
          <Route path="/admin/users">
            <ProtectedRoute requiredPermission="manage_users">
              <AdminUsers />
            </ProtectedRoute>
          </Route>
          <Route path="/admin/roles">
            <ProtectedRoute adminOnly>
              <AdminRoles />
            </ProtectedRoute>
          </Route>
          
          {/* User profile and settings */}
          <Route path="/achievements">
            <ProtectedRoute>
              <Achievements />
            </ProtectedRoute>
          </Route>
          <Route path="/profile">
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          </Route>
          <Route path="/settings">
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          </Route>
          <Route path="/settings/google-oauth">
            <ProtectedRoute requiredPermission="manage_settings">
              <GoogleOAuth />
            </ProtectedRoute>
          </Route>
          <Route path="/settings/google-oauth/callback" component={GoogleOAuth} />
          
          <Route component={NotFound} />
        </Switch>
      </AppLayout>
    </AuthContext.Provider>
  );
  
  // Handle loading state
  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }
  
  // If not authenticated and not on auth route, redirect to login
  if (!authenticated && !isAuthRoute) {
    return navigate('/auth/login');
  }
  
  // If authenticated and on auth route, redirect to dashboard
  if (authenticated && isAuthRoute) {
    return navigate('/');
  }
  
  // Otherwise, return the appropriate routes
  return isAuthRoute ? authRoutes : appRoutes;
}

export default App;
