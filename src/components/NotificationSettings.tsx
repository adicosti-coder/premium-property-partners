import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";

export default function NotificationSettings() {
  const { t } = useLanguage();
  const { isSupported, isSubscribed, isLoading, permission, subscribe, unsubscribe } = usePushNotifications();

  const handleToggle = async () => {
    if (isSubscribed) {
      const success = await unsubscribe();
      if (success) {
        toast.success(t.notifications?.disabled || "Notifications disabled");
      }
    } else {
      const success = await subscribe();
      if (success) {
        toast.success(t.notifications?.enabled || "Notifications enabled");
      }
    }
  };

  if (!isSupported) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BellOff className="w-4 h-4 text-muted-foreground" />
            {t.notifications?.title || "Push Notifications"}
          </CardTitle>
          <CardDescription>
            {t.notifications?.notSupported || "Push notifications are not supported in this browser"}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="w-4 h-4 text-primary" />
          {t.notifications?.title || "Push Notifications"}
        </CardTitle>
        <CardDescription>
          {t.notifications?.description || "Get notified when new properties are added to your favorite zones"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : (
              <Switch
                checked={isSubscribed}
                onCheckedChange={handleToggle}
                disabled={isLoading || permission === 'denied'}
              />
            )}
            <span className="text-sm text-muted-foreground">
              {isSubscribed 
                ? (t.notifications?.statusEnabled || "Enabled")
                : (t.notifications?.statusDisabled || "Disabled")}
            </span>
          </div>
          
          {permission === 'denied' && (
            <span className="text-xs text-destructive">
              {t.notifications?.permissionDenied || "Permission denied in browser settings"}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
