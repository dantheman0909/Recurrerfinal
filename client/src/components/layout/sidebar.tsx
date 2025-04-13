import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useUserContext } from "@/lib/user-context";

// Navigation items
const navigationItems = [
  { name: "Dashboard", path: "/dashboard", icon: "fas fa-chart-pie" },
  { name: "Customer 360", path: "/customers", icon: "fas fa-users" },
  { name: "Task Management", path: "/tasks", icon: "fas fa-tasks" },
  { name: "Playbooks", path: "/playbooks", icon: "fas fa-book" },
  { name: "Reports", path: "/reports", icon: "fas fa-chart-line" },
  { name: "Red Zone Alerts", path: "/red-zone", icon: "fas fa-exclamation-triangle" },
  { name: "Admin Panel", path: "/admin", icon: "fas fa-cog" }
];

interface SidebarProps {
  isOpen?: boolean;
}

export function Sidebar({ isOpen = false }: SidebarProps) {
  const [location] = useLocation();
  const { user, signOut } = useUserContext();

  return (
    <div className={cn(
      "md:flex md:flex-shrink-0 transform transition-transform duration-200 ease-in-out",
      isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
    )}>
      <div className="flex flex-col w-64">
        <div className="flex flex-col h-0 flex-1 bg-white border-r border-gray-200">
          {/* Logo */}
          <div className="flex items-center h-16 flex-shrink-0 px-4 bg-white border-b border-gray-200">
            <div className="flex items-center">
              <span className="font-bold text-xl bg-gradient-to-r from-teal-500 to-teal-700 text-transparent bg-clip-text">Recurrer</span>
              <span className="ml-2 text-xs text-gray-500 font-medium">CUSTOMER SUCCESS OS</span>
            </div>
          </div>
          
          {/* Navigation */}
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <nav className="mt-5 flex-1 px-4 space-y-1">
              {navigationItems.map((item) => {
                const isActive = location === item.path || 
                  (item.path !== "/dashboard" && location.startsWith(item.path));
                
                return (
                  <Link 
                    key={item.name} 
                    href={item.path}
                  >
                    <a className={cn(
                      "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                      isActive
                        ? "bg-gradient-to-r from-teal-500 to-teal-700 text-white"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}>
                      <i className={cn(
                        item.icon,
                        "mr-3",
                        isActive ? "" : "text-gray-400"
                      )}></i>
                      {item.name}
                    </a>
                  </Link>
                );
              })}
            </nav>
          </div>
          
          {/* User Profile */}
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <div className="flex-shrink-0 w-full group block">
              <div className="flex items-center">
                <div>
                  {user?.avatarUrl ? (
                    <img 
                      className="inline-block h-9 w-9 rounded-full" 
                      src={user.avatarUrl} 
                      alt={user.fullName || "User avatar"} 
                    />
                  ) : (
                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-200">
                      <span className="text-sm font-medium text-gray-500">
                        {user?.fullName?.charAt(0) || "U"}
                      </span>
                    </div>
                  )}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                    {user?.fullName || "User"}
                  </p>
                  <p className="text-xs font-medium text-gray-500 group-hover:text-gray-700">
                    {user?.role === "admin" ? "Admin" : 
                     user?.role === "team_lead" ? "Team Lead" : "CSM"}
                  </p>
                </div>
                <div className="ml-auto">
                  <button 
                    onClick={signOut}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <i className="fas fa-sign-out-alt"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
