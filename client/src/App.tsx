import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Customers from "@/pages/customers";
import CustomerDetail from "@/pages/customer-detail";
import Tasks from "@/pages/tasks";
import Playbooks from "@/pages/playbooks";
import Reports from "@/pages/reports";
import RedZone from "@/pages/red-zone";
import Admin from "@/pages/admin";
import Auth from "@/pages/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useState, useEffect } from "react";
import { UserContextProvider } from "@/lib/user-context";

function App() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Close mobile menu when location changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  // Check if we're on the auth page
  const isAuthPage = location === "/auth";

  return (
    <QueryClientProvider client={queryClient}>
      <UserContextProvider>
        {isAuthPage ? (
          <Auth />
        ) : (
          <div className="flex h-screen overflow-hidden">
            <Sidebar isOpen={isMobileMenuOpen} />
            <div className="flex flex-col w-0 flex-1 overflow-hidden">
              <Header 
                onMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
              />
              <main className="flex-1 relative overflow-y-auto focus:outline-none">
                <AppRoutes />
              </main>
            </div>
          </div>
        )}
        <Toaster />
      </UserContextProvider>
    </QueryClientProvider>
  );
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/customers" component={Customers} />
      <Route path="/customers/:id" component={CustomerDetail} />
      <Route path="/tasks" component={Tasks} />
      <Route path="/playbooks" component={Playbooks} />
      <Route path="/reports" component={Reports} />
      <Route path="/red-zone" component={RedZone} />
      <Route path="/admin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default App;
