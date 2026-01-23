import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Lock, LogIn, UserPlus, Sparkles, Star, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLanguage } from "@/i18n/LanguageContext";
import { Link } from "react-router-dom";
import ConfettiEffect from "./ConfettiEffect";
import { useUISound } from "@/hooks/useUISound";

interface AuthGateOverlayProps {
  title?: string;
  description?: string;
}

const AuthGateOverlay = ({ title, description }: AuthGateOverlayProps) => {
  const { language } = useLanguage();
  const [showConfetti, setShowConfetti] = useState(false);
  const { playSound } = useUISound();
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [recentSignups, setRecentSignups] = useState(0);

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

  // Simulated recent signups counter
  useEffect(() => {
    // Start with a base number between 15-25
    const baseNumber = 15 + Math.floor(Math.random() * 10);
    setRecentSignups(baseNumber);

    // Occasionally increment to simulate real-time activity
    const incrementInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        setRecentSignups(prev => prev + 1);
      }
    }, 8000);

    return () => clearInterval(incrementInterval);
  }, []);

  const handleSignupClick = () => {
    setShowConfetti(true);
    playSound("success");
    // Reset after animation completes
    setTimeout(() => setShowConfetti(false), 3000);
  };

  const t = {
    ro: {
      badge: "✨ Înregistrare gratuită • Rezultate în 10 secunde",
      title: title || "Autentifică-te pentru a vedea rezultatele",
      description: description || "Creează un cont gratuit pentru a vedea estimările și a-ți salva simulările.",
      login: "Autentifică-te",
      signup: "Creează cont gratuit",
      loginTooltip: "Accesează contul tău pentru a vedea istoricul simulărilor și ofertele personalizate",
      recommended: "Recomandat",
      urgency: "Ofertă expiră în",
      recentSignups: "s-au înregistrat în ultima oră",
      benefits: [
        "Salvează simulările tale",
        "Acces la istoric complet",
        "Primește oferte personalizate",
      ],
    },
    en: {
      badge: "✨ Free signup • Results in 10 seconds",
      title: title || "Sign in to see the results",
      description: description || "Create a free account to view estimates and save your simulations.",
      login: "Sign in",
      signup: "Create free account",
      loginTooltip: "Access your account to view simulation history and personalized offers",
      recommended: "Recommended",
      urgency: "Offer expires in",
      recentSignups: "signed up in the last hour",
      benefits: [
        "Save your simulations",
        "Access complete history",
        "Receive personalized offers",
      ],
    },
  };

  const text = t[language as keyof typeof t] || t.ro;

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

        {/* Benefits */}
        <ul className="text-left space-y-2 mb-6">
          {text.benefits.map((benefit, index) => (
            <motion.li 
              key={index} 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.1, duration: 0.3 }}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary text-xs">✓</span>
              </div>
              {benefit}
            </motion.li>
          ))}
        </ul>

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
