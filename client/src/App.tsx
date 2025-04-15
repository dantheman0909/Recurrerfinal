import { Route, Switch } from "wouter";
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
import ProtectedRoute from "@/components/protected-route";

// Simple router component
function App() {
  return (
    <Switch>
      {/* Auth routes */}
      <Route path="/auth/login">
        <AuthLayout title="Recurrer Authentication" description="Sign in to your account">
          <LoginPage />
        </AuthLayout>
      </Route>
      <Route path="/auth/signup">
        <AuthLayout title="Recurrer Authentication" description="Create your account">
          <SignupPage />
        </AuthLayout>
      </Route>
      
      {/* App routes wrapped in the AppLayout */}
      <Route path="/unauthorized" component={UnauthorizedPage} />
      
      <Route path="/google-oauth-callback" component={GoogleOAuth} /> 
      
      {/* Protected routes requiring authentication */}
      <Route path="/">
        <AppLayout>
          <Switch>
            <Route path="/" component={Dashboard} />
            
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
            
            <Route component={NotFound} />
          </Switch>
        </AppLayout>
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

export default App;
