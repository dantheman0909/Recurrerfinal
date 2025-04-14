import React from "react";
import Sidebar from "@/components/sidebar/sidebar";
import Topbar from "@/components/topbar/topbar";
import { useMobile } from "@/hooks/use-mobile";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const isMobile = useMobile();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  // Close sidebar when switching to desktop
  React.useEffect(() => {
    if (!isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 text-gray-800 font-sans">
      {/* Sidebar - always visible on desktop, conditionally on mobile */}
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      
      {/* Main Content Area */}
      <div className="flex-1 overflow-auto focus:outline-none bg-background">
        {/* Top Navigation */}
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        
        {/* Page Content */}
        <main className="flex-1 relative pb-8 z-0 overflow-y-auto px-4 sm:px-6 lg:px-8 pt-4">
          {children}
        </main>
      </div>
    </div>
  );
}
