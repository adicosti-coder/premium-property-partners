import { useState, useEffect } from "react";
import { Clock, Flame } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { motion } from "framer-motion";

interface UrgencyTimerProps {
  endDate?: Date;
  variant?: "default" | "compact" | "banner";
  className?: string;
}

const UrgencyTimer = ({ endDate, variant = "default", className }: UrgencyTimerProps) => {
  const { language } = useLanguage();
  
  // Default to end of current month if no date provided
  const targetDate = endDate || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59);
  
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  const t = {
    ro: {
      title: "Ofertă limitată",
      subtitle: "Oferta expiră în:",
      days: "zile",
      hours: "ore",
      minutes: "min",
      seconds: "sec",
      expired: "Oferta a expirat",
      hurry: "Grăbește-te!",
    },
    en: {
      title: "Limited offer",
      subtitle: "Offer expires in:",
      days: "days",
      hours: "hours",
      minutes: "min",
      seconds: "sec",
      expired: "Offer expired",
      hurry: "Hurry up!",
    },
  };

  const text = t[language as keyof typeof t] || t.ro;

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = targetDate.getTime() - new Date().getTime();
      
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  const isExpired = timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0;
  const isUrgent = timeLeft.days < 3;

  if (variant === "compact") {
    return (
      <div className={`flex items-center gap-2 text-sm ${className}`}>
        <Clock className={`w-4 h-4 ${isUrgent ? "text-destructive animate-pulse" : "text-primary"}`} />
        <span className="font-medium">
          {isExpired ? text.expired : (
            <>
              {timeLeft.days > 0 && `${timeLeft.days}${text.days[0]} `}
              {String(timeLeft.hours).padStart(2, "0")}:
              {String(timeLeft.minutes).padStart(2, "0")}:
              {String(timeLeft.seconds).padStart(2, "0")}
            </>
          )}
        </span>
      </div>
    );
  }

  if (variant === "banner") {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white py-3 px-4 ${className}`}
      >
        <div className="container mx-auto flex items-center justify-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            {isUrgent && <Flame className="w-5 h-5 animate-pulse" />}
            <span className="font-semibold">{text.title}</span>
          </div>
          
          {!isExpired && (
            <div className="flex items-center gap-3">
              {[
                { value: timeLeft.days, label: text.days },
                { value: timeLeft.hours, label: text.hours },
                { value: timeLeft.minutes, label: text.minutes },
                { value: timeLeft.seconds, label: text.seconds },
              ].map((item, index) => (
                <div key={index} className="text-center">
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg px-2 py-1 min-w-[40px]">
                    <span className="font-bold text-lg">{String(item.value).padStart(2, "0")}</span>
                  </div>
                  <span className="text-xs opacity-80">{item.label}</span>
                </div>
              ))}
            </div>
          )}
          
          {isUrgent && !isExpired && (
            <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium animate-pulse">
              {text.hurry}
            </span>
          )}
        </div>
      </motion.div>
    );
  }

  // Default variant
  return (
    <div className={`bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-red-500/10 border border-amber-500/30 rounded-xl p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        {isUrgent ? (
          <Flame className="w-5 h-5 text-destructive animate-pulse" />
        ) : (
          <Clock className="w-5 h-5 text-amber-500" />
        )}
        <span className="font-semibold text-foreground">{text.subtitle}</span>
      </div>
      
      {isExpired ? (
        <p className="text-muted-foreground text-center py-2">{text.expired}</p>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {[
            { value: timeLeft.days, label: text.days },
            { value: timeLeft.hours, label: text.hours },
            { value: timeLeft.minutes, label: text.minutes },
            { value: timeLeft.seconds, label: text.seconds },
          ].map((item, index) => (
            <motion.div
              key={index}
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="text-center"
            >
              <div className={`bg-card border rounded-lg py-2 ${
                isUrgent && index === 3 ? "border-destructive/50" : "border-border"
              }`}>
                <span className={`text-2xl font-bold ${
                  isUrgent ? "text-destructive" : "text-foreground"
                }`}>
                  {String(item.value).padStart(2, "0")}
                </span>
              </div>
              <span className="text-xs text-muted-foreground mt-1 block">{item.label}</span>
            </motion.div>
          ))}
        </div>
      )}
      
      {isUrgent && !isExpired && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-sm text-destructive font-medium mt-3 flex items-center justify-center gap-1"
        >
          <Flame className="w-4 h-4" />
          {text.hurry}
        </motion.p>
      )}
    </div>
  );
};

export default UrgencyTimer;
