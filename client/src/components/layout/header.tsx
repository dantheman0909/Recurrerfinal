import { useState } from "react";
import { useUserContext } from "@/lib/user-context";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Bell, Search, HelpCircle } from "lucide-react";
import { Input } from "@/components/ui/input";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useUserContext();

  return (
    <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
      <button 
        type="button" 
        className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-500 md:hidden"
        onClick={onMenuClick}
      >
        <span className="sr-only">Open sidebar</span>
        <i className="fas fa-bars h-6 w-6"></i>
      </button>
      
      <div className="flex-1 px-4 flex justify-between">
        <div className="flex-1 flex">
          <div className="w-full flex md:ml-0">
            <label htmlFor="search-field" className="sr-only">Search</label>
            <div className="relative w-full text-gray-400 focus-within:text-gray-600">
              <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none">
                <Search className="h-5 w-5 ml-3" />
              </div>
              <Input
                id="search-field"
                className="block w-full h-full pl-10 pr-3 py-2 border-transparent text-gray-900 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-0 focus:border-transparent sm:text-sm"
                placeholder="Search customers, tasks, or playbooks"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
        
        <div className="ml-4 flex items-center md:ml-6">
          {/* Notification Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="relative bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500">
                <span className="sr-only">View notifications</span>
                <Bell className="h-6 w-6" />
                <div className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-500 rounded-full">
                  3
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="px-4 py-3 font-medium border-b">Notifications</div>
              <DropdownMenuItem className="cursor-pointer py-3">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Task due today</span>
                  <span className="text-xs text-gray-500">Schedule quarterly review for Acme Corp</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer py-3">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Red Zone Alert</span>
                  <span className="text-xs text-gray-500">GlobalTech has low data tagging percentage</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer py-3">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Campaign Status</span>
                  <span className="text-xs text-gray-500">TechStart Inc monthly campaign sent successfully</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer text-center text-teal-600 hover:text-teal-500 py-2 font-medium">
                View all notifications
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Help Button */}
          <button type="button" className="ml-3 bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500">
            <span className="sr-only">Help</span>
            <HelpCircle className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
