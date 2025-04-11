import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, Menu, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TopbarProps {
  onMenuClick: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  return (
    <div className="relative z-10 flex-shrink-0 flex h-16 bg-white border-b border-gray-200">
      <Button
        variant="ghost"
        size="icon"
        className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:bg-gray-100 focus:text-gray-600 md:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-6 w-6" />
      </Button>
      
      <div className="flex-1 px-4 flex justify-between">
        <div className="flex-1 flex">
          <div className="w-full flex md:ml-0 relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              className="pl-10 pr-3 py-2 border-transparent rounded-md w-full focus:ring-0"
              placeholder="Search customers, tasks or campaigns"
              type="search"
            />
          </div>
        </div>
        
        <div className="ml-4 flex items-center md:ml-6">
          <Button variant="ghost" size="icon" className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none relative">
            <span className="sr-only">View notifications</span>
            <Bell className="h-6 w-6" />
            <span className="absolute top-1 right-1 -mt-1 -mr-1 flex h-4 w-4">
              <span className="animate-ping absolute h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative rounded-full h-4 w-4 bg-red-500 flex items-center justify-center text-white text-xs">3</span>
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
