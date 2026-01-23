import { motion } from "framer-motion";
import { Lock, LogIn, UserPlus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { Link } from "react-router-dom";

interface AuthGateOverlayProps {
  title?: string;
  description?: string;
}

const AuthGateOverlay = ({ title, description }: AuthGateOverlayProps) => {
  const { language } = useLanguage();

  const t = {
    ro: {
      badge: "✨ Înregistrare gratuită • Rezultate în 10 secunde",
      title: title || "Autentifică-te pentru a vedea rezultatele",
      description: description || "Creează un cont gratuit pentru a vedea estimările și a-ți salva simulările.",
      login: "Autentifică-te",
      signup: "Creează cont gratuit",
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
      benefits: [
        "Save your simulations",
        "Access complete history",
        "Receive personalized offers",
      ],
    },
  };

  const text = t[language as keyof typeof t] || t.ro;

  return (
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

        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Lock className="w-8 h-8 text-primary" />
        </div>
        
        <h3 className="text-2xl font-serif font-bold text-foreground mb-3">
          {text.title}
        </h3>
        
        <p className="text-muted-foreground mb-6">
          {text.description}
        </p>

        {/* Benefits */}
        <ul className="text-left space-y-2 mb-6">
          {text.benefits.map((benefit, index) => (
            <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary text-xs">✓</span>
              </div>
              {benefit}
            </li>
          ))}
        </ul>

        <div className="space-y-3">
          <Button asChild className="w-full" size="lg">
            <Link to="/auth?mode=signup">
              <UserPlus className="w-4 h-4 mr-2" />
              {text.signup}
            </Link>
          </Button>
          
          <Button asChild variant="outline" className="w-full" size="lg">
            <Link to="/auth">
              <LogIn className="w-4 h-4 mr-2" />
              {text.login}
            </Link>
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AuthGateOverlay;
