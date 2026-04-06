import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Bell, CheckCircle2, Clock, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { mockNotifications, Notification, NotificationType } from "@/data/notifications";

export function NotificationModal() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case "sos":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case "task":
        return <CheckCircle2 className="h-4 w-4 text-primary" />;
      case "visit":
        return <Clock className="h-4 w-4 text-accent" />;
      case "system":
        return <Info className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getPriorityBadge = (priority?: string) => {
    if (!priority) return null;
    switch (priority) {
      case "high":
        return <Badge variant="destructive" className="ml-2 text-[10px] h-4">High</Badge>;
      case "medium":
        return <Badge variant="secondary" className="ml-2 text-[10px] h-4 bg-accent/20 text-accent">Medium</Badge>;
      default:
        return null;
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-secondary transition-colors">
          <Bell className="h-4 w-4 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-accent text-accent-foreground text-[10px] font-bold rounded-full flex items-center justify-center animate-in zoom-in-50">
              {unreadCount}
            </span>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden gap-0">
        <DialogHeader className="p-6 pb-4 flex flex-row items-center justify-between space-y-0">
          <div className="space-y-1">
            <DialogTitle>Notifications</DialogTitle>
            <DialogDescription>
              Stay updated with your latest alerts and tasks.
            </DialogDescription>
          </div>
          {unreadCount > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={markAllAsRead}
              className="text-xs h-8 px-3"
            >
              Mark all as read
            </Button>
          )}
        </DialogHeader>
        <Separator />
        <div className="max-h-[400px] overflow-y-auto px-1 py-2 custom-scrollbar">
          {notifications.length === 0 ? (
            <div className="py-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No notifications found.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "group relative flex items-start gap-4 p-3 rounded-lg transition-colors hover:bg-secondary/50 mx-2",
                    !notification.isRead && "bg-primary/5 border-l-2 border-primary"
                  )}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className={cn(
                    "mt-1 p-2 rounded-full",
                    notification.type === 'sos' ? "bg-destructive/10" : "bg-primary/10"
                  )}>
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 space-y-1 pr-4">
                    <div className="flex items-center justify-between">
                      <p className={cn("text-sm font-medium", !notification.isRead && "text-primary")}>
                        {notification.title}
                        {getPriorityBadge(notification.priority)}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notification.description}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-medium pt-1">
                      {notification.timestamp}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <Separator />
        <div className="p-4 bg-muted/30">
          <Button variant="ghost" className="w-full text-xs text-muted-foreground hover:text-primary">
            View all activity logs
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
