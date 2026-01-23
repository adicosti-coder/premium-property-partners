import { useNotifications, UserNotification } from "@/hooks/useNotifications";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bell, 
  Check, 
  Trash2, 
  ExternalLink, 
  Info, 
  CheckCircle, 
  AlertTriangle, 
  Zap,
  X,
  BellOff
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ro, enUS } from "date-fns/locale";
import { Link } from "react-router-dom";

const OwnerNotifications = () => {
  const { language } = useLanguage();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
  } = useNotifications();

  const translations = {
    ro: {
      title: "Notificări",
      noNotifications: "Nicio notificare",
      noNotificationsDesc: "Toate notificările tale vor apărea aici",
      markAllRead: "Marchează toate citite",
      clearAll: "Șterge toate",
      viewAction: "Vezi detalii",
      unread: "necitite",
    },
    en: {
      title: "Notifications",
      noNotifications: "No notifications",
      noNotificationsDesc: "All your notifications will appear here",
      markAllRead: "Mark all read",
      clearAll: "Clear all",
      viewAction: "View details",
      unread: "unread",
    },
  };

  const t = translations[language] || translations.ro;

  const getTypeIcon = (type: UserNotification["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case "action":
        return <Zap className="w-5 h-5 text-primary" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getTypeBorderClass = (type: UserNotification["type"]) => {
    switch (type) {
      case "success":
        return "border-l-emerald-500";
      case "warning":
        return "border-l-amber-500";
      case "action":
        return "border-l-primary";
      default:
        return "border-l-blue-500";
    }
  };

  const formatTime = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: language === "ro" ? ro : enUS,
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">{t.title}</CardTitle>
            {unreadCount > 0 && (
              <p className="text-sm text-muted-foreground">
                {unreadCount} {t.unread}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs"
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
              className="text-xs text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <BellOff className="w-8 h-8 opacity-50" />
            </div>
            <p className="font-medium">{t.noNotifications}</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              {t.noNotificationsDesc}
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px] -mx-6 px-6">
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {notifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    layout
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    className={`
                      relative group p-4 rounded-lg border-l-4 
                      ${getTypeBorderClass(notification.type)}
                      ${notification.is_read 
                        ? "bg-muted/30" 
                        : "bg-card border border-border shadow-sm"
                      }
                      transition-all duration-200 hover:shadow-md
                    `}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getTypeIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={`font-medium ${
                              notification.is_read 
                                ? "text-muted-foreground" 
                                : "text-foreground"
                            }`}
                          >
                            {notification.title}
                          </p>
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <p
                          className={`text-sm mt-1 ${
                            notification.is_read 
                              ? "text-muted-foreground/70" 
                              : "text-muted-foreground"
                          }`}
                        >
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-xs text-muted-foreground/60">
                            {formatTime(notification.created_at)}
                          </span>
                          <div className="flex items-center gap-2">
                            {!notification.is_read && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            )}
                            {notification.action_url && (
                              <Link
                                to={notification.action_url}
                                onClick={() => {
                                  if (!notification.is_read) {
                                    markAsRead(notification.id);
                                  }
                                }}
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                              >
                                {notification.action_label || t.viewAction}
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    {!notification.is_read && (
                      <span className="absolute top-4 right-4 w-2 h-2 bg-primary rounded-full" />
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default OwnerNotifications;
