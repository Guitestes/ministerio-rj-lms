import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { notificationService, Notification } from '@/services/notificationService';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

const NotificationBell = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    if (!user) return;
    const { notifications, unreadCount } = await notificationService.getUserNotifications(user.id);
    setNotifications(notifications);
    setUnreadCount(unreadCount);
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [user]);

  const handleMarkAsRead = async (notificationId: string) => {
    await notificationService.markAsRead(notificationId);
    fetchNotifications();
  };

  const getNotificationLink = (notification: Notification) => {
    // If a direct link is provided in the notification, use it.
    if (notification.link) {
      return notification.link;
    }

    // Fallback logic for older or different notification types.
    if (notification.relatedType === 'contract') {
      return '/admin/service-providers';
    }
    // A sensible default if no link is found.
    return '/';
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative">
          <Bell className="h-6 w-6" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="p-2 font-bold">Notificações</div>
        {notifications.length === 0 ? (
          <div className="p-2 text-sm text-gray-500">Nenhuma notificação</div>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className={`flex flex-col items-start p-2 ${!notification.isRead ? 'bg-blue-50' : ''}`}
              onClick={() => !notification.isRead && handleMarkAsRead(notification.id)}
            >
              <Link to={getNotificationLink(notification)} className="w-full">
                <div className="font-bold">{notification.title}</div>
                <p className="text-sm text-gray-600">{notification.message}</p>
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(notification.createdAt).toLocaleString()}
                </div>
              </Link>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationBell;
