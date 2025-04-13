import { useEffect, useState } from 'react';
import { Bell, CheckCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
  related_id: number | null;
  related_type: string | null;
}

export function NotificationCenter({ userId }: { userId: number }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  // Get notifications for the user
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['/api/notifications', userId],
    queryFn: async () => {
      const response = await fetch(`/api/notifications?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      return response.json();
    },
    enabled: !!userId,
  });

  // Mark a notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      return apiRequest(`/api/notifications/${notificationId}/mark-read`, 'PATCH');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications', userId] });
    },
  });

  // Mark all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/notifications/mark-all-read', 'PATCH', { userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications', userId] });
      setOpen(false);
    },
  });

  // Calculate unread count
  const unreadCount = notifications.filter((n: Notification) => !n.is_read).length;

  // Auto-close the popover when all notifications are read
  useEffect(() => {
    if (open && unreadCount === 0) {
      setTimeout(() => setOpen(false), 1000);
    }
  }, [unreadCount, open]);

  // Handle clicking a notification
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }
    
    // Navigate if there's a link
    if (notification.link) {
      window.location.href = notification.link;
    }
  };

  // Get icon for notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task_assigned':
      case 'task_due_soon':
      case 'task_overdue':
        return <div className="w-2 h-2 rounded-full bg-orange-500 mr-2" />;
      case 'red_zone_alert':
        return <div className="w-2 h-2 rounded-full bg-red-500 mr-2" />;
      case 'customer_renewal':
        return <div className="w-2 h-2 rounded-full bg-green-500 mr-2" />;
      case 'achievement_earned':
        return <div className="w-2 h-2 rounded-full bg-purple-500 mr-2" />;
      default:
        return <div className="w-2 h-2 rounded-full bg-blue-500 mr-2" />;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              variant="destructive"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 font-medium flex items-center justify-between">
          <h3 className="text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs h-7"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
            >
              Mark all as read
            </Button>
          )}
        </div>
        <Separator />
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No notifications</div>
          ) : (
            <div className="space-y-1 p-0">
              {notifications.map((notification: Notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start gap-3 p-3 cursor-pointer hover:bg-muted transition-colors ${
                    notification.is_read ? 'opacity-70' : 'font-medium'
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="text-sm">{notification.title}</div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </div>
                  </div>
                  {!notification.is_read && (
                    <div className="flex-shrink-0 pt-0.5">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}