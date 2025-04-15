import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { AvatarWithInitials } from "../ui/avatar-with-initials";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Home,
  Users,
  CheckSquare,
  Layers,
  BarChart2,
  AlertTriangle,
  Settings,
  XCircle,
  LucideIcon
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { GradientCard } from "../ui/gradient-card";
import { Button } from "../ui/button";
import { useQuery } from "@tanstack/react-query";

interface SubItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  badgeCount?: number;
  subItems?: SubItem[];
}

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export default function Sidebar({ open, setOpen }: SidebarProps) {
  const [location] = useLocation();

  const currentUser = {
    name: "Sarah Johnson",
    role: "Team Lead",
    avatar: ""
  };
  
  // Fetch active RedZone alerts
  const { data: redZoneAlerts = [] } = useQuery({
    queryKey: ['/api/red-zone'],
  });
  
  // Count only active (non-resolved) alerts
  const activeRedZoneCount = Array.isArray(redZoneAlerts) 
    ? redZoneAlerts.filter((alert: any) => alert.status === 'open').length
    : 0;

  const navigationItems: NavigationItem[] = [
    { name: "Dashboard", href: "/", icon: Home },
    { name: "Customer 360", href: "/customers", icon: Users },
    { name: "Task Management", href: "/tasks", icon: CheckSquare },
    { name: "Playbooks", href: "/playbooks", icon: Layers },
    { name: "Reports", href: "/reports", icon: BarChart2 },
    { 
      name: "Red Zone", 
      href: "/red-zone", 
      icon: AlertTriangle, 
      badgeCount: activeRedZoneCount > 0 ? activeRedZoneCount : undefined,
      subItems: [
        { name: "Settings", href: "/red-zone/settings", icon: Settings }
      ]
    },
    { name: "Admin", href: "/admin", icon: Settings },
    { 
      name: "Settings", 
      href: "/settings", 
      icon: Settings,
      subItems: [
        { name: "Google OAuth", href: "/settings/google-oauth", icon: Users }
      ]
    }
  ];
  
  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center flex-shrink-0 px-4 py-5 md:mb-5">
        <GradientCard className="px-3 py-2 w-full flex justify-center">
          <span className="font-bold text-lg">Recurrer</span>
        </GradientCard>
      </div>
      
      <nav className="flex-1 px-2 pb-4 space-y-1">
        {navigationItems.map((item) => {
          const isActive = location === item.href;
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const Icon = item.icon;
          
          return (
            <div key={item.name} className="space-y-1">
              <Link href={item.href}>
                <div
                  className={cn(
                    "group flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer",
                    isActive
                      ? "bg-gradient-to-br from-[#1E99A0] via-[#0D9298] to-[#16797E] text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  <Icon 
                    className={cn(
                      "h-5 w-5 mr-3",
                      item.name === "Red Zone" && !isActive ? "text-red-500" : ""
                    )} 
                  />
                  {item.name}
                  {item.badgeCount && (
                    <Badge variant="outline" className={cn(
                      "ml-auto py-0.5 px-2 text-xs rounded-full",
                      isActive ? "bg-red-500 text-white border-red-400" : "bg-red-100 text-red-500 border-red-200"
                    )}>
                      {item.badgeCount}
                    </Badge>
                  )}
                </div>
              </Link>
              
              {/* Sub-items */}
              {hasSubItems && item.subItems && (
                <div className="ml-4 pl-4 border-l border-gray-200">
                  {item.subItems.map((subItem) => {
                    const isSubActive = location === subItem.href;
                    const SubIcon = subItem.icon;
                    
                    return (
                      <Link key={subItem.name} href={subItem.href}>
                        <div
                          className={cn(
                            "group flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer",
                            isSubActive
                              ? "bg-gradient-to-br from-[#1E99A0] via-[#0D9298] to-[#16797E] text-white"
                              : "text-gray-600 hover:bg-gray-100"
                          )}
                        >
                          <SubIcon className="h-4 w-4 mr-3" />
                          {subItem.name}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      
      <div className="px-3 mt-auto">
        <div className="flex items-center px-2 py-3 mb-2">
          <AvatarWithInitials
            name={currentUser.name}
            imageUrl={currentUser.avatar}
            className="h-8 w-8"
          />
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-800">{currentUser.name}</p>
            <p className="text-xs text-gray-500">{currentUser.role}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile sidebar */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="p-0 w-64 sm:max-w-sm">
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-2 top-2"
            onClick={() => setOpen(false)}
          >
            <XCircle className="h-5 w-5" />
          </Button>
          {sidebarContent}
        </SheetContent>
      </Sheet>
      
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64 border-r border-gray-200 bg-white">
          {sidebarContent}
        </div>
      </div>
    </>
  );
}
