'use client';

import { useEffect, useState } from 'react';
import { Bell, CheckCheck, Megaphone, Calendar, Info } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  link: string | null;
  type: string;
  isRead: boolean;
  createdAt: string;
}

import { formatDateLocale } from '@/lib/utils';
import {
  requestNotificationPermission,
  triggerNativeNotification,
} from '@/features/notifications/device-notifications';

export function NotificationBell() {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<string>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const res = await apiFetch<{ count: number }>('/notifications/unread-count');
      setUnreadCount(res.count);
      if (res.count > 0) {
        // Fetch notifications to trigger native device push for unread items
        fetchNotifications();
      }
    } catch (err) {
      // Ignore auth / network errors silently
    }
  };

  const fetchNotifications = async () => {
    try {
      const list = await apiFetch<NotificationItem[]>('/notifications?limit=20');
      setNotifications(list);

      // Trigger native OS device notification for unread items
      list.forEach((n) => {
        if (!n.isRead) {
          triggerNativeNotification(n);
        }
      });
    } catch (err) {
      // Ignore
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 20000); // refresh every 20s
    return () => clearInterval(interval);
  }, []);

  const handleOpenChange = async (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      const status = await requestNotificationPermission();
      setPermissionStatus(status);
      fetchNotifications();
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiFetch('/notifications/mark-all-read', { method: 'POST' });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      // Ignore
    }
  };

  const handleNotificationClick = async (n: NotificationItem) => {
    if (!n.isRead) {
      try {
        await apiFetch(`/notifications/${n.id}/read`, { method: 'PATCH' });
        setUnreadCount((c) => Math.max(0, c - 1));
        setNotifications((prev) =>
          prev.map((item) => (item.id === n.id ? { ...item, isRead: true } : item)),
        );
      } catch (err) {
        // Ignore
      }
    }
    if (n.link) {
      setOpen(false);
      router.push(n.link);
    }
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case 'announcement':
        return <Megaphone className="size-4 text-amber-500 shrink-0 mt-0.5" />;
      case 'lesson_assigned':
      case 'reminder':
        return <Calendar className="size-4 text-blue-500 shrink-0 mt-0.5" />;
      default:
        return <Info className="size-4 text-emerald-500 shrink-0 mt-0.5" />;
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
        >
          <Bell className="size-5 text-foreground" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 rounded-full px-1 text-[11px] font-bold flex items-center justify-center border-2 border-background animate-pulse"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 sm:w-96 p-0 shadow-xl border-border bg-card"
      >
        <div className="flex flex-col border-b border-border">
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">الإشعارات</span>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {unreadCount} غير مقروء
                </Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
              >
                <CheckCheck className="size-3.5" />
                تحديد الكل كمقروء
              </Button>
            )}
          </div>

          {permissionStatus === 'default' && (
            <div className="bg-primary/10 px-3 py-2 flex items-center justify-between gap-2 text-xs border-t border-border/50">
              <span className="text-muted-foreground">تفعيل إشعارات الجهاز والمنبهات</span>
              <Button
                size="sm"
                variant="default"
                className="h-6 text-[11px] px-2"
                onClick={async () => {
                  const status = await requestNotificationPermission();
                  setPermissionStatus(status);
                }}
              >
                تفعيل
              </Button>
            </div>
          )}
        </div>

        <div className="max-h-80 min-h-[12rem] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <Bell className="size-8 opacity-30 mb-2" />
              <p className="text-sm">لا يوجد إشعارات حالياً</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`w-full text-start p-3 transition-colors flex items-start gap-3 hover:bg-accent/50 ${
                    !n.isRead ? 'bg-accent/20 font-medium' : 'opacity-80'
                  }`}
                >
                  {renderIcon(n.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <h4 className="text-xs font-bold text-foreground truncate">
                        {n.title}
                      </h4>
                      {!n.isRead && (
                        <span className="size-2 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>

                    <span className="text-[10px] text-muted-foreground/70 mt-1.5 block">
                      {new Date(n.createdAt).toLocaleDateString(formatDateLocale('ar'), {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
