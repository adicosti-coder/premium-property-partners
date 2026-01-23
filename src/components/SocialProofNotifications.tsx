import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Clock, User } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

interface Notification {
  id: number;
  name: string;
  location: string;
  property: string;
  timeAgo: string;
  timeAgoEn: string;
}

// Simulated recent bookings - in production, this would come from your database
const recentBookings: Notification[] = [
  { id: 1, name: "Maria D.", location: "București", property: "Studio Modern Centru", timeAgo: "acum 5 minute", timeAgoEn: "5 minutes ago" },
  { id: 2, name: "Andrei P.", location: "Cluj-Napoca", property: "Apartament Lux 2 Camere", timeAgo: "acum 12 minute", timeAgoEn: "12 minutes ago" },
  { id: 3, name: "Elena S.", location: "Iași", property: "Penthouse cu Vedere", timeAgo: "acum 23 minute", timeAgoEn: "23 minutes ago" },
  { id: 4, name: "Georg M.", location: "Wien", property: "Studio Cozy Opera", timeAgo: "acum 34 minute", timeAgoEn: "34 minutes ago" },
  { id: 5, name: "Cristina B.", location: "Timișoara", property: "Apartament Family", timeAgo: "acum 45 minute", timeAgoEn: "45 minutes ago" },
  { id: 6, name: "Mihai R.", location: "Constanța", property: "Studio Business", timeAgo: "acum 52 minute", timeAgoEn: "52 minutes ago" },
  { id: 7, name: "Sophie L.", location: "Berlin", property: "Loft Ultracentral", timeAgo: "acum 1 oră", timeAgoEn: "1 hour ago" },
  { id: 8, name: "Alexandru T.", location: "Brașov", property: "Apartament Panoramic", timeAgo: "acum 1 oră", timeAgoEn: "1 hour ago" },
];

const SocialProofNotifications = () => {
  const { language } = useLanguage();
  const [currentNotification, setCurrentNotification] = useState<Notification | null>(null);
  const [notificationIndex, setNotificationIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  const t = {
    ro: {
      justBooked: "tocmai a rezervat",
      verifiedBooking: "Rezervare verificată",
    },
    en: {
      justBooked: "just booked",
      verifiedBooking: "Verified booking",
    },
  };

  const text = t[language as keyof typeof t] || t.ro;

  useEffect(() => {
    // Check if user has dismissed notifications
    const dismissed = sessionStorage.getItem("socialProofDismissed");
    if (dismissed) return;

    // Initial delay before showing first notification
    const initialDelay = setTimeout(() => {
      showNotification();
    }, 8000);

    return () => clearTimeout(initialDelay);
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    // Hide notification after 5 seconds
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
    }, 5000);

    return () => clearTimeout(hideTimer);
  }, [isVisible, currentNotification]);

  useEffect(() => {
    if (isVisible) return;
    if (sessionStorage.getItem("socialProofDismissed")) return;

    // Show next notification after random interval (15-30 seconds)
    const nextInterval = Math.random() * 15000 + 15000;
    const showTimer = setTimeout(() => {
      showNotification();
    }, nextInterval);

    return () => clearTimeout(showTimer);
  }, [isVisible, notificationIndex]);

  const showNotification = () => {
    const nextIndex = (notificationIndex + 1) % recentBookings.length;
    setCurrentNotification(recentBookings[nextIndex]);
    setNotificationIndex(nextIndex);
    setIsVisible(true);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem("socialProofDismissed", "true");
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
            {/* Progress bar */}
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 5, ease: "linear" }}
              className="h-1 bg-primary origin-left"
            />

            <div className="p-4">
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center shrink-0">
                  <User className="w-6 h-6 text-primary" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-foreground font-medium text-sm">
                    <span className="font-bold">{currentNotification.name}</span>
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
                      {language === "en" ? currentNotification.timeAgoEn : currentNotification.timeAgo}
                    </span>
                  </div>
                </div>

                {/* Close hint */}
                <button
                  onClick={handleDismiss}
                  className="text-muted-foreground hover:text-foreground text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ✕
                </button>
              </div>

              {/* Verified badge */}
              <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border/50">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-muted-foreground">
                  {text.verifiedBooking}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SocialProofNotifications;
