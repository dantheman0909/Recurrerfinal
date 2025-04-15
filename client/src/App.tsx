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

/**
 * Simple App Component with no auth dependencies
 * TEMPORARY DEVELOPMENT VERSION - Bypasses authentication checks to allow development
 */
function App() {
  const location = window.location.pathname;
  const isAuthRoute = location.startsWith('/auth');
  
  // Auth routes (login/signup)
  if (isAuthRoute) {
    return (
      <AuthLayout title="Recurrer Authentication" description="Sign in to your account">
        <Switch>
          <Route path="/auth/login" component={LoginPage} />
          <Route path="/auth/signup" component={SignupPage} />
          <Route>
            {() => {
              window.location.href = '/auth/login';
              return null;
            }}
          </Route>
        </Switch>
      </AuthLayout>
    );
  }
  
  // Main application routes
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/unauthorized" component={UnauthorizedPage} />
        
        {/* Customer routes */}
        <Route path="/customers/import/diagnostics">
          <ImportDiagnostics />
        </Route>
        <Route path="/customers">
          <Customers />
        </Route>
        <Route path="/customers/:id">
          <CustomerDetails />
        </Route>
        
        {/* Task routes */}
        <Route path="/tasks">
          <Tasks />
        </Route>
        
        {/* Playbook routes */}
        <Route path="/playbooks">
          <Playbooks />
        </Route>
        <Route path="/playbooks/workflow">
          <PlaybookWorkflow />
        </Route>
        
        {/* Reports route */}
        <Route path="/reports">
          <Reports />
        </Route>
        
        {/* Red zone routes */}
        <Route path="/red-zone">
          <RedZone />
        </Route>
        <Route path="/red-zone/settings">
          <RedZoneSettingsEnhanced />
        </Route>
        
        {/* Admin routes */}
        <Route path="/admin">
          <Admin />
        </Route>
        <Route path="/admin/users">
          <AdminUsers />
        </Route>
        <Route path="/admin/roles">
          <AdminRoles />
        </Route>
        
        {/* User profile and settings */}
        <Route path="/achievements">
          <Achievements />
        </Route>
        <Route path="/profile">
          <Profile />
        </Route>
        <Route path="/settings">
          <Settings />
        </Route>
        <Route path="/settings/google-oauth">
          <GoogleOAuth />
        </Route>
        <Route path="/settings/google-oauth/callback" component={GoogleOAuth} />
        
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

export default App;
