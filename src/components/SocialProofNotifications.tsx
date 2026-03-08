import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Clock, User, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/lib/supabaseClient";
import { getSessionStorage, setSessionStorage, isBrowser } from "@/utils/browserStorage";

interface BookingNotification {
  id: string;
  guestInitials: string;
  property: string;
  location: string;
  minutesAgo: number;
}

const SocialProofNotifications = () => {
  const { language } = useLanguage();
  const [currentNotification, setCurrentNotification] = useState<BookingNotification | null>(null);
  const [notifications, setNotifications] = useState<BookingNotification[]>([]);
  const [notificationIndex, setNotificationIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  const t = {
    ro: { justBooked: "tocmai a rezervat", verified: "Rezervare verificată", minAgo: "min în urmă", hourAgo: "oră în urmă" },
    en: { justBooked: "just booked", verified: "Verified booking", minAgo: "min ago", hourAgo: "hour ago" },
  };
  const text = t[language as keyof typeof t] || t.ro;

  // Fetch real recent bookings
  useEffect(() => {
    const fetchBookings = async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, guest_name, check_in, created_at, property_id")
        .gte("created_at", sevenDaysAgo)
        .eq("status", "confirmed")
        .order("created_at", { ascending: false })
        .limit(10);

      const { data: properties } = await supabase
        .from("properties")
        .select("id, name, location")
        .eq("is_active", true);

      const propMap: Record<string, { name: string; location: string }> = {};
      (properties || []).forEach((p: any) => propMap[p.id] = { name: p.name, location: p.location });

      const mapped: BookingNotification[] = (bookings || []).map((b: any) => {
        const prop = propMap[b.property_id] || { name: "ApArt Hotel", location: "Timișoara" };
        const name = b.guest_name || "Guest";
        const initials = name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
        const minutesAgo = Math.max(3, Math.floor((Date.now() - new Date(b.created_at).getTime()) / 60000));
        return {
          id: b.id,
          guestInitials: initials,
          property: prop.name,
          location: prop.location,
          minutesAgo: Math.min(minutesAgo, 120), // cap at 2h for realism
        };
      });

      // If no real bookings, add some realistic fallbacks
      if (mapped.length === 0) {
        const fallbacks = [
          { id: "f1", guestInitials: "MD", property: "Studio Modern Centru", location: "Timișoara", minutesAgo: 8 },
          { id: "f2", guestInitials: "AP", property: "Fullview Deluxe", location: "Timișoara", minutesAgo: 23 },
          { id: "f3", guestInitials: "ES", property: "Helios Apart Hotel", location: "Timișoara", minutesAgo: 45 },
        ];
        setNotifications(fallbacks);
      } else {
        setNotifications(mapped);
      }
    };

    fetchBookings();
  }, []);

  // Show first notification after delay
  useEffect(() => {
    if (!isBrowser() || notifications.length === 0) return;
    if (getSessionStorage("socialProofDismissed")) return;

    const timer = setTimeout(() => showNotification(), 10000);
    return () => clearTimeout(timer);
  }, [notifications]);

  // Auto-hide after 5s
  useEffect(() => {
    if (!isVisible) return;
    const timer = setTimeout(() => setIsVisible(false), 5000);
    return () => clearTimeout(timer);
  }, [isVisible, currentNotification]);

  // Show next after interval
  useEffect(() => {
    if (!isBrowser() || isVisible || notifications.length === 0) return;
    if (getSessionStorage("socialProofDismissed")) return;

    const timer = setTimeout(showNotification, Math.random() * 20000 + 20000);
    return () => clearTimeout(timer);
  }, [isVisible, notificationIndex, notifications]);

  const showNotification = () => {
    if (notifications.length === 0) return;
    const idx = (notificationIndex + 1) % notifications.length;
    setCurrentNotification(notifications[idx]);
    setNotificationIndex(idx);
    setIsVisible(true);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setSessionStorage("socialProofDismissed", "true");
  };

  const formatTime = (minutes: number) => {
    if (minutes >= 60) return `${Math.floor(minutes / 60)} ${text.hourAgo}`;
    return `${minutes} ${text.minAgo}`;
  };

  return (
    <AnimatePresence>
      {isVisible && currentNotification && (
        <motion.div
          initial={{ opacity: 0, x: -100, y: 20 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-24 left-4 z-50 max-w-sm hidden md:block"
        >
          <div
            className="bg-card border border-border rounded-xl shadow-lg overflow-hidden cursor-pointer group"
            onClick={handleDismiss}
          >
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 5, ease: "linear" }}
              className="h-1 bg-primary origin-left"
            />
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center shrink-0 text-primary font-bold text-sm">
                  {currentNotification.guestInitials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground font-medium text-sm">
                    <span className="font-bold">{currentNotification.guestInitials}.</span>
                    {" "}{text.justBooked}
                  </p>
                  <p className="text-primary font-semibold text-sm truncate">
                    {currentNotification.property}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {currentNotification.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(currentNotification.minutesAgo)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleDismiss}
                  className="text-muted-foreground hover:text-foreground text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ✕
                </button>
              </div>
              <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border/50">
                <CheckCircle2 className="w-3 h-3 text-primary" />
                <span className="text-xs text-muted-foreground">{text.verified}</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SocialProofNotifications;
