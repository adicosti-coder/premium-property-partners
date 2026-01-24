import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Lock, 
  LogIn, 
  UserPlus, 
  Sparkles, 
  Star, 
  Clock, 
  Users,
  MapPin,
  History,
  Heart,
  Share2,
  Bell,
  Calculator,
  FileText,
  Crown,
  ChevronRight,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLanguage } from "@/i18n/LanguageContext";
import { Link } from "react-router-dom";
import ConfettiEffect from "./ConfettiEffect";
import { useUISound } from "@/hooks/useUISound";
import { toast } from "@/hooks/use-toast";

interface AuthGateOverlayProps {
  title?: string;
  description?: string;
  context?: "calculator" | "city-guide" | "favorites" | "general";
}

const AuthGateOverlay = ({ title, description, context = "general" }: AuthGateOverlayProps) => {
  const { language } = useLanguage();
  const [showConfetti, setShowConfetti] = useState(false);
  const { playSound } = useUISound();
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [recentSignups, setRecentSignups] = useState(0);
  const [hoveredBenefit, setHoveredBenefit] = useState<number | null>(null);

  // Countdown to midnight
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      
      return {
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      };
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Fake names for toast notifications
  const fakeNames = {
    ro: ["Maria D.", "Andrei P.", "Elena M.", "Alexandru T.", "Ioana C.", "Mihai R.", "Cristina L.", "Dan S.", "Ana V.", "George B."],
    en: ["John D.", "Sarah M.", "Michael P.", "Emma L.", "David R.", "Anna K.", "James T.", "Lisa C.", "Robert B.", "Sophie W."]
  };

  const showSignupToast = useCallback(() => {
    const names = fakeNames[language as keyof typeof fakeNames] || fakeNames.ro;
    const randomName = names[Math.floor(Math.random() * names.length)];
    const message = language === "ro" 
      ? `${randomName} tocmai s-a înregistrat` 
      : `${randomName} just signed up`;
    
    toast({
      title: language === "ro" ? "🎉 Înregistrare nouă" : "🎉 New signup",
      description: message,
    });
  }, [language]);

  // Simulated recent signups counter
  useEffect(() => {
    const baseNumber = 15 + Math.floor(Math.random() * 10);
    setRecentSignups(baseNumber);

    const incrementInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        setRecentSignups(prev => prev + 1);
      }
    }, 8000);

    return () => clearInterval(incrementInterval);
  }, []);

  // Periodic toast notifications for social proof
  useEffect(() => {
    const initialDelay = 5000 + Math.random() * 5000;
    const initialTimeout = setTimeout(() => {
      showSignupToast();
    }, initialDelay);

    const toastInterval = setInterval(() => {
      if (Math.random() > 0.4) {
        showSignupToast();
      }
    }, 15000 + Math.random() * 10000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(toastInterval);
    };
  }, [showSignupToast]);

  const handleSignupClick = () => {
    setShowConfetti(true);
    playSound("success");
    setTimeout(() => setShowConfetti(false), 3000);
  };

  // Premium benefits with context-based highlighting
  const premiumBenefits = {
    ro: [
      { icon: MapPin, text: "50+ locații exclusive City Guide", tooltip: "Descoperă restaurante, cafenele și atracții ascunse", category: "city-guide" },
      { icon: History, text: "Istoric simulări salvate", tooltip: "Compară și revizuiește estimările tale anterioare", category: "calculator" },
      { icon: Heart, text: "Favorite sincronizate pe toate dispozitivele", tooltip: "Accesează-ți locurile preferate de oriunde", category: "favorites" },
      { icon: Share2, text: "Partajare locații cu prietenii", tooltip: "Trimite recomandări personalizate", category: "city-guide" },
      { icon: Bell, text: "Notificări personalizate", tooltip: "Fii primul care află despre oferte noi", category: "general" },
      { icon: Calculator, text: "Estimări detaliate de randament", tooltip: "Analiză completă pentru investiții imobiliare", category: "calculator" },
      { icon: FileText, text: "Export PDF personalizat", tooltip: "Descarcă ghiduri și rapoarte pentru offline", category: "general" },
      { icon: Star, text: "Suport prioritar 24/7", tooltip: "Răspuns rapid la întrebările tale", category: "general" },
    ],
    en: [
      { icon: MapPin, text: "50+ exclusive City Guide spots", tooltip: "Discover hidden restaurants, cafes and attractions", category: "city-guide" },
      { icon: History, text: "Saved simulation history", tooltip: "Compare and review your previous estimates", category: "calculator" },
      { icon: Heart, text: "Favorites synced across devices", tooltip: "Access your favorite places from anywhere", category: "favorites" },
      { icon: Share2, text: "Share locations with friends", tooltip: "Send personalized recommendations", category: "city-guide" },
      { icon: Bell, text: "Personalized notifications", tooltip: "Be the first to know about new offers", category: "general" },
      { icon: Calculator, text: "Detailed yield estimates", tooltip: "Complete analysis for real estate investments", category: "calculator" },
      { icon: FileText, text: "Custom PDF export", tooltip: "Download guides and reports for offline use", category: "general" },
      { icon: Star, text: "Priority support 24/7", tooltip: "Quick response to your questions", category: "general" },
    ],
  };

  const t = {
    ro: {
      badge: "✨ Cont gratuit • Acces complet în 10 secunde",
      premiumBadge: "Beneficii Premium",
      title: title || "Autentifică-te pentru acces complet",
      description: description || "Creează un cont gratuit pentru a debloca toate funcționalitățile platformei.",
      login: "Autentifică-te",
      signup: "Creează cont gratuit",
      loginTooltip: "Accesează contul tău pentru a vedea istoricul simulărilor și ofertele personalizate",
      recommended: "Recomandat",
      urgency: "Ofertă expiră în",
      recentSignups: "s-au înregistrat în ultima oră",
      freeForever: "Gratuit pentru totdeauna",
      noCardRequired: "Fără card de credit",
    },
    en: {
      badge: "✨ Free signup • Full access in 10 seconds",
      premiumBadge: "Premium Benefits",
      title: title || "Sign in for full access",
      description: description || "Create a free account to unlock all platform features.",
      login: "Sign in",
      signup: "Create free account",
      loginTooltip: "Access your account to view simulation history and personalized offers",
      recommended: "Recommended",
      urgency: "Offer expires in",
      recentSignups: "signed up in the last hour",
      freeForever: "Free forever",
      noCardRequired: "No credit card required",
    },
  };

  const text = t[language as keyof typeof t] || t.ro;
  const benefits = premiumBenefits[language as keyof typeof premiumBenefits] || premiumBenefits.ro;

  // Sort benefits to show context-relevant ones first
  const sortedBenefits = [...benefits].sort((a, b) => {
    if (a.category === context && b.category !== context) return -1;
    if (a.category !== context && b.category === context) return 1;
    return 0;
  });

  return (
    <>
      <ConfettiEffect isActive={showConfetti} particleCount={60} />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 z-20 flex items-center justify-center"
      >
      {/* Blur backdrop */}
      <div className="absolute inset-0 backdrop-blur-md bg-background/60" />
      
      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="relative z-10 bg-card border border-border rounded-2xl p-8 max-w-md mx-4 shadow-2xl text-center"
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/10 border border-gold/20 text-gold mb-6"
        >
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-medium">{text.badge}</span>
        </motion.div>

        {/* Recent signups counter */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25 }}
          className="flex items-center justify-center gap-2 mb-4 text-xs text-muted-foreground"
        >
          <Users className="w-3.5 h-3.5 text-primary" />
          <span>
            <motion.span
              key={recentSignups}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-block font-semibold text-primary"
            >
              {recentSignups}
            </motion.span>
            {" "}{text.recentSignups}
          </span>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ 
            opacity: 1, 
            scale: 1,
            boxShadow: [
              "0 0 0 0 hsl(var(--primary) / 0)",
              "0 0 30px 10px hsl(var(--primary) / 0.4)",
              "0 0 20px 5px hsl(var(--primary) / 0.2)"
            ]
          }}
          transition={{ 
            delay: 0.25,
            duration: 0.5,
            boxShadow: { delay: 0.5, duration: 1, ease: "easeOut" }
          }}
          className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6"
        >
          <Lock className="w-8 h-8 text-primary" />
        </motion.div>
        
        <h3 className="text-2xl font-serif font-bold text-foreground mb-3">
          {text.title}
        </h3>
        
        <p className="text-muted-foreground mb-6">
          {text.description}
        </p>

        {/* Premium Benefits Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="flex items-center justify-center gap-2 mb-4"
        >
          <motion.div
            animate={{ 
              rotate: [0, 10, -10, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              repeatDelay: 3 
            }}
          >
            <Crown className="w-4 h-4 text-gold" />
          </motion.div>
          <span className="text-sm font-semibold text-gold">{text.premiumBadge}</span>
        </motion.div>

        {/* Enhanced Benefits List */}
        <div className="text-left space-y-2 mb-6 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
          {sortedBenefits.map((benefit, index) => {
            const isHighlighted = benefit.category === context;
            return (
              <TooltipProvider key={index}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + index * 0.05, duration: 0.3 }}
                      onMouseEnter={() => setHoveredBenefit(index)}
                      onMouseLeave={() => setHoveredBenefit(null)}
                      className={`
                        flex items-center gap-3 p-2 rounded-lg cursor-pointer
                        transition-all duration-200
                        ${isHighlighted 
                          ? "bg-gold/10 border border-gold/20" 
                          : "hover:bg-muted/50"
                        }
                        ${hoveredBenefit === index ? "scale-[1.02]" : ""}
                      `}
                    >
                      <motion.div 
                        animate={hoveredBenefit === index ? { scale: 1.1 } : { scale: 1 }}
                        className={`
                          w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                          ${isHighlighted 
                            ? "bg-gold/20" 
                            : "bg-primary/10"
                          }
                        `}
                      >
                        <benefit.icon className={`w-4 h-4 ${isHighlighted ? "text-gold" : "text-primary"}`} />
                      </motion.div>
                      <span className={`text-sm ${isHighlighted ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                        {benefit.text}
                      </span>
                      <AnimatePresence>
                        {hoveredBenefit === index && (
                          <motion.div
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -5 }}
                            className="ml-auto"
                          >
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <p className="text-sm">{benefit.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>

        {/* Free forever badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-center gap-4 mb-4"
        >
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Check className="w-3.5 h-3.5 text-emerald-500" />
            {text.freeForever}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Check className="w-3.5 h-3.5 text-emerald-500" />
            {text.noCardRequired}
          </span>
        </motion.div>

        <div className="space-y-3">
          {/* Recommended badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            className="flex justify-center"
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/20 border border-gold/30 text-gold text-xs font-semibold">
              <Star className="w-3 h-3 fill-gold" />
              {text.recommended}
            </span>
          </motion.div>

          <motion.div
            animate={{ 
              boxShadow: [
                "0 0 0 0 hsl(var(--primary) / 0)",
                "0 0 0 8px hsl(var(--primary) / 0.3)",
                "0 0 0 0 hsl(var(--primary) / 0)"
              ]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="rounded-lg"
          >
            <Button 
              asChild 
              className="w-full transition-transform duration-200 hover:scale-105 active:scale-95 bg-gradient-to-r from-primary via-primary/80 to-primary bg-[length:200%_100%] animate-[gradient-shift_3s_ease-in-out_infinite]" 
              size="lg"
              onClick={handleSignupClick}
            >
              <Link to="/auth?mode=signup" onClick={handleSignupClick}>
                <UserPlus className="w-4 h-4 mr-2" />
                {text.signup}
              </Link>
            </Button>
          </motion.div>

          {/* Countdown timer */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="flex items-center justify-center gap-2 text-xs text-muted-foreground"
          >
            <Clock className="w-3.5 h-3.5 text-destructive" />
            <span>{text.urgency}</span>
            <div className="flex items-center gap-1 font-mono font-semibold text-destructive">
              <span className="bg-destructive/10 px-1.5 py-0.5 rounded">
                {String(timeLeft.hours).padStart(2, '0')}
              </span>
              <span>:</span>
              <span className="bg-destructive/10 px-1.5 py-0.5 rounded">
                {String(timeLeft.minutes).padStart(2, '0')}
              </span>
              <span>:</span>
              <span className="bg-destructive/10 px-1.5 py-0.5 rounded">
                {String(timeLeft.seconds).padStart(2, '0')}
              </span>
            </div>
          </motion.div>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button asChild variant="outline" className="w-full" size="lg">
                  <Link to="/auth">
                    <LogIn className="w-4 h-4 mr-2" />
                    {text.login}
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-center">
                <p>{text.loginTooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </motion.div>
      </motion.div>
    </>
  );
};

export default AuthGateOverlay;
