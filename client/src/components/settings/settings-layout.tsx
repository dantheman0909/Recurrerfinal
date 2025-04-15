import React from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SettingsIcon, MailIcon, CalendarIcon, UserIcon, ServerIcon } from 'lucide-react';

interface SettingsLayoutProps {
  children: React.ReactNode;
}

interface SettingsNavItemProps {
  href: string;
  title: string;
  icon: React.ReactNode;
  current: boolean;
}

function SettingsNavItem({ href, title, icon, current }: SettingsNavItemProps) {
  return (
    <Link href={href}>
      <Button 
        variant={current ? "secondary" : "ghost"} 
        className={cn(
          "w-full justify-start gap-2",
          current ? "bg-secondary" : "hover:bg-secondary/50"
        )}
      >
        {icon}
        {title}
      </Button>
    </Link>
  );
}

export function SettingsLayout({ children }: SettingsLayoutProps) {
  const [location] = useLocation();

  const navItems = [
    { href: '/settings', title: 'General', icon: <SettingsIcon className="h-4 w-4" /> },
    { href: '/settings/google-oauth', title: 'Google Integration', icon: <ServerIcon className="h-4 w-4" /> },
    { href: '/settings/gmail', title: 'Gmail', icon: <MailIcon className="h-4 w-4" /> },
    { href: '/settings/calendar', title: 'Calendar', icon: <CalendarIcon className="h-4 w-4" /> },
    { href: '/settings/profile', title: 'Profile', icon: <UserIcon className="h-4 w-4" /> },
  ];

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      
      <div className="flex flex-col md:flex-row gap-6">
        <aside className="w-full md:w-64 flex-shrink-0">
          <nav className="space-y-2">
            {navItems.map((item) => (
              <SettingsNavItem
                key={item.href}
                href={item.href}
                title={item.title}
                icon={item.icon}
                current={location === item.href}
              />
            ))}
          </nav>
        </aside>
        
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}