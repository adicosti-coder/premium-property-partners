import { Bell, Check, Trash2, ExternalLink, Info, CheckCircle, AlertTriangle, Zap, X, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, UserNotification } from "@/hooks/useNotifications";
import { useLanguage } from "@/i18n/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ro, enUS } from "date-fns/locale";
import { Link } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import ConfettiEffect from "@/components/ConfettiEffect";

// Helper to detect badge notifications
const isBadgeNotification = (notification: UserNotification): boolean => {
  return notification.title.includes("badge") || notification.title.includes("🏆");
};

const NotificationBell = () => {
  const { language } = useLanguage();
  const {
    isAuthenticated,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
  } = useNotifications();
  const [open, setOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [celebratedBadges, setCelebratedBadges] = useState<Set<string>>(() => {
    // Load already celebrated badges from localStorage
    try {
      const stored = localStorage.getItem("celebratedBadgeNotifications");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Check for new badge notifications and trigger confetti
  const checkForNewBadges = useCallback(() => {
    const unreadBadgeNotifications = notifications.filter(
      (n) => !n.is_read && isBadgeNotification(n) && !celebratedBadges.has(n.id)
    );

    if (unreadBadgeNotifications.length > 0 && open) {
      // Trigger confetti
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 100);

      // Mark these as celebrated
      const newCelebrated = new Set(celebratedBadges);
      unreadBadgeNotifications.forEach((n) => newCelebrated.add(n.id));
      setCelebratedBadges(newCelebrated);
      
      try {
        localStorage.setItem(
          "celebratedBadgeNotifications",
          JSON.stringify([...newCelebrated])
        );
      } catch {
        // Ignore storage errors
      }
    }
  }, [notifications, open, celebratedBadges]);

  useEffect(() => {
    if (open) {
      checkForNewBadges();
    }
  }, [open, checkForNewBadges]);

  if (!isAuthenticated) return null;

  const t = {
    title: language === "ro" ? "Notificări" : "Notifications",
    noNotifications: language === "ro" ? "Nicio notificare" : "No notifications",
    markAllRead: language === "ro" ? "Marchează toate citite" : "Mark all read",
    clearAll: language === "ro" ? "Șterge toate" : "Clear all",
    viewAction: language === "ro" ? "Vezi detalii" : "View details",
  };

  const getTypeIcon = (notification: UserNotification) => {
    // Special icon for badge notifications
    if (isBadgeNotification(notification)) {
      return <Trophy className="w-4 h-4 text-amber-500" />;
    }
    
    switch (notification.type) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case "action":
        return <Zap className="w-4 h-4 text-primary" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getTypeBgClass = (notification: UserNotification) => {
    if (notification.is_read) return "bg-muted/30";
    
    // Special styling for badge notifications
    if (isBadgeNotification(notification)) {
      return "bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-l-2 border-l-amber-500";
    }
    
    switch (notification.type) {
      case "success":
        return "bg-emerald-500/10 border-l-2 border-l-emerald-500";
      case "warning":
        return "bg-amber-500/10 border-l-2 border-l-amber-500";
      case "action":
        return "bg-primary/10 border-l-2 border-l-primary";
      default:
        return "bg-blue-500/10 border-l-2 border-l-blue-500";
    }
  };

  const formatTime = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: language === "ro" ? ro : enUS,
    });
  };

  const handleNotificationClick = async (notification: UserNotification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    if (notification.action_url) {
      setOpen(false);
    }
  };

  return (
    <>
      <ConfettiEffect isActive={showConfetti} duration={3500} particleCount={60} />
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-110 hover:-translate-y-0.5"
        >
          <Bell className="w-4 h-4" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center font-medium"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 md:w-96 p-0 bg-background/95 backdrop-blur-xl border-border shadow-xl"
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">{t.title}</h3>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
              >
                <Check className="w-3 h-3 mr-1" />
                {t.markAllRead}
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllNotifications}
                className="text-xs text-muted-foreground hover:text-destructive h-7 px-2"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">{t.noNotifications}</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              <AnimatePresence mode="popLayout">
                {notifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    layout
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    className={`relative group p-3 ${getTypeBgClass(notification)} transition-colors duration-200 hover:bg-muted/50`}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {isBadgeNotification(notification) && !notification.is_read ? (
                          <motion.div
                            animate={{ 
                              scale: [1, 1.2, 1],
                              rotate: [0, -10, 10, 0]
                            }}
                            transition={{ 
                              duration: 0.6,
                              repeat: Infinity,
                              repeatDelay: 2
                            }}
                          >
                            {getTypeIcon(notification)}
                          </motion.div>
                        ) : (
                          getTypeIcon(notification)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={`text-sm font-medium ${notification.is_read ? "text-muted-foreground" : "text-foreground"}`}
                          >
                            {notification.title}
                          </p>
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p
                          className={`text-xs mt-0.5 line-clamp-2 ${notification.is_read ? "text-muted-foreground/70" : "text-muted-foreground"}`}
                        >
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] text-muted-foreground/60">
                            {formatTime(notification.created_at)}
                          </span>
                          {notification.action_url && (
                            <Link
                              to={notification.action_url}
                              onClick={() => handleNotificationClick(notification)}
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              {notification.action_label || t.viewAction}
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                    {!notification.is_read && (
                      <span className="absolute top-3 right-3 w-2 h-2 bg-primary rounded-full" />
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
    </>
  );
};

export default NotificationBell;
