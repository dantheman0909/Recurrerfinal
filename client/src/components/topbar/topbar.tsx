import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Menu, Search, User } from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import { NotificationCenter } from "@/components/notification/notification-center";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ProfileProgress } from "@/components/achievement/profile-progress";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "wouter";

interface TopbarProps {
  onMenuClick: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  // Fetch current user - in a real app this might come from a user context instead
  const { data: currentUser } = useQuery({
    queryKey: ['/api/users/current'],
    queryFn: async () => {
      // For now we'll just use user ID 1 as the current user
      const response = await fetch('/api/users/1');
      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }
      return response.json();
    },
  });

  const userId = currentUser?.id || 1; // Default to user 1 if not loaded yet

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
        
        <div className="ml-4 flex items-center space-x-4 md:ml-6">
          {/* Notification Center */}
          <NotificationCenter userId={userId} />
          
          {/* User Profile Menu */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 overflow-hidden">
                <Avatar>
                  <AvatarImage src={currentUser?.avatar_url || ''} alt={currentUser?.name || 'User'} />
                  <AvatarFallback>
                    {currentUser?.name?.charAt(0) || <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="p-4">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={currentUser?.avatar_url || ''} alt={currentUser?.name || 'User'} />
                    <AvatarFallback>
                      {currentUser?.name?.charAt(0) || <User className="h-6 w-6" />}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{currentUser?.name || 'Loading...'}</div>
                    <div className="text-xs text-muted-foreground">
                      {currentUser?.email || ''}
                    </div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {currentUser?.role || ''}
                    </div>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              {/* User progress */}
              <div className="p-4">
                <ProfileProgress userId={userId} />
              </div>
              
              <Separator />
              
              <div className="p-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/profile">View Profile</Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/achievements">Achievements</Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild className="col-span-2">
                    <Link href="/admin">Settings</Link>
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
