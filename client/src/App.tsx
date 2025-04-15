import { Route, Switch } from "wouter";
import NotFound from "@/pages/not-found";
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
import Achievements from "@/pages/achievements";
import Profile from "@/pages/profile";
import Settings from "@/pages/settings";
import GoogleOAuth from "@/pages/settings/google-oauth";
import AppLayout from "@/components/layouts/app-layout";
import { AuthLayout } from "@/components/layouts/auth-layout";
import LoginPage from "@/pages/auth/login";
import SignupPage from "@/pages/auth/signup";
import { useLocation } from "wouter";
import { useAuth } from "./context/auth-context";

function App() {
  const [location] = useLocation();
  const isAuthRoute = location.startsWith('/auth');
  
  // Use auth context for authentication state
  const { authenticated, loading } = useAuth();
  
  // Separate content based on authentication routes
  const authRoutes = (
    <AuthLayout title="Recurrer Authentication" description="Sign in to your account">
      <Switch>
        <Route path="/auth/login" component={LoginPage} />
        <Route path="/auth/signup" component={SignupPage} />
        <Route component={() => {
          window.location.href = '/auth/login';
          return null;
        }} />
      </Switch>
    </AuthLayout>
  );
  
  const appRoutes = (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/customers/import/diagnostics" component={ImportDiagnostics} />
        <Route path="/customers" component={Customers} />
        <Route path="/customers/:id" component={CustomerDetails} />
        <Route path="/tasks" component={Tasks} />
        <Route path="/playbooks" component={Playbooks} />
        <Route path="/playbooks/workflow" component={PlaybookWorkflow} />
        <Route path="/reports" component={Reports} />
        <Route path="/red-zone" component={RedZone} />
        <Route path="/red-zone/settings" component={RedZoneSettingsEnhanced} />
        <Route path="/admin" component={Admin} />
        <Route path="/admin/users" component={AdminUsers} />
        <Route path="/achievements" component={Achievements} />
        <Route path="/profile" component={Profile} />
        <Route path="/settings" component={Settings} />
        <Route path="/settings/google-oauth" component={GoogleOAuth} />
        <Route path="/settings/google-oauth/callback" component={GoogleOAuth} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
  
  // Handle loading state
  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }
  
  // If not authenticated and not on auth route, redirect to login
  if (!authenticated && !isAuthRoute) {
    // Redirect to login
    window.location.href = '/auth/login';
    return null;
  }
  
  // If authenticated and on auth route, redirect to dashboard
  if (authenticated && isAuthRoute) {
    window.location.href = '/';
    return null;
  }
  
  // Otherwise, return the appropriate routes
  return isAuthRoute ? authRoutes : appRoutes;
}

export default App;
