import { useState, useEffect } from "react";
import { Bell, BellOff, Loader2, MapPin, Check } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getActiveProperties } from "@/data/properties";

// Extract unique locations from active properties
const activeProperties = getActiveProperties();
const locations = [...new Set(activeProperties.map(p => p.location))];
const availableLocations = [...new Set(activeProperties.map(p => p.location))];

export default function NotificationSettings() {
  const { t } = useLanguage();
  const { isSupported, isSubscribed, isLoading, permission, subscribe, unsubscribe } = usePushNotifications();
  const [preferredLocations, setPreferredLocations] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingPrefs, setIsLoadingPrefs] = useState(true);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('preferred_locations, notifications_enabled')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data?.preferred_locations) {
        setPreferredLocations(data.preferred_locations);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setIsLoadingPrefs(false);
    }
  };

  const handleToggle = async () => {
    if (isSubscribed) {
      const success = await unsubscribe();
      if (success) {
        await updateNotificationsEnabled(false);
        toast.success(t.notifications?.disabled || "Notifications disabled");
      }
    } else {
      if (preferredLocations.length === 0) {
        toast.error(t.notifications?.selectZonesFirst || "Please select at least one zone first");
        return;
      }
      const success = await subscribe();
      if (success) {
        await updateNotificationsEnabled(true);
        toast.success(t.notifications?.enabled || "Notifications enabled");
      }
    }
  };

  const updateNotificationsEnabled = async (enabled: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('profiles')
        .update({ notifications_enabled: enabled })
        .eq('id', user.id);
    } catch (error) {
      console.error('Error updating notifications enabled:', error);
    }
  };

  const toggleLocation = async (location: string) => {
    const newLocations = preferredLocations.includes(location)
      ? preferredLocations.filter(l => l !== location)
      : [...preferredLocations, location];

    setPreferredLocations(newLocations);
    await savePreferences(newLocations);
  };

  const savePreferences = async (locations: string[]) => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ preferred_locations: locations })
        .eq('id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error(t.notifications?.saveError || "Failed to save preferences");
    } finally {
      setIsSaving(false);
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
      <CardContent className="space-y-4">
        {/* Zone selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            {t.notifications?.selectZones || "Select preferred zones"}
          </label>
          
          {isLoadingPrefs ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{t.common?.loading || "Loading..."}</span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availableLocations.map((location) => {
                const isSelected = preferredLocations.includes(location);
                return (
                  <Badge
                    key={location}
                    variant={isSelected ? "default" : "outline"}
                    className={`cursor-pointer transition-all hover:scale-105 ${
                      isSelected 
                        ? "bg-primary text-primary-foreground" 
                        : "hover:bg-secondary"
                    }`}
                    onClick={() => toggleLocation(location)}
                  >
                    {isSelected && <Check className="w-3 h-3 mr-1" />}
                    {location}
                  </Badge>
                );
              })}
            </div>
          )}
          
          {isSaving && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              {t.notifications?.saving || "Saving..."}
            </p>
          )}
        </div>

        {/* Notification toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
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

        {preferredLocations.length === 0 && !isSubscribed && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {t.notifications?.noZonesHint || "Select at least one zone to enable notifications"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
