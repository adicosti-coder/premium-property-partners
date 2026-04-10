import { useState, useEffect } from "react";
import { 
  Menu, 
  X, 
  MessageCircle, 
  ChevronUp, 
  Accessibility, 
  Gift, 
  Bot,
  Mic,
  MicOff,
  Loader2,
  Calculator,
  Download,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageContext";
import { cn } from "@/lib/utils";
import { useCtaAnalytics } from "@/hooks/useCtaAnalytics";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";

interface FloatingActionMenuProps {
  showChatbot?: boolean;
  showVoice?: boolean;
}

const FloatingActionMenu = ({ showChatbot = true, showVoice = true }: FloatingActionMenuProps) => {
  const { t, language } = useLanguage();
  const { trackWhatsApp } = useCtaAnalytics();
  const { lightTap, mediumTap } = useHapticFeedback();
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [pwaInstallable, setPwaInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Voice state from ElevenLabsWidget via custom events
  const [voiceConnecting, setVoiceConnecting] = useState(false);
  const [voiceConnected, setVoiceConnected] = useState(false);
  const [voiceSpeaking, setVoiceSpeaking] = useState(false);

  useEffect(() => {
    const handleVoiceState = (e: CustomEvent) => {
      const { isConnecting, isConnected, isSpeaking } = e.detail;
      setVoiceConnecting(isConnecting);
      setVoiceConnected(isConnected);
      setVoiceSpeaking(isSpeaking);
    };
    window.addEventListener('elevenlabs-voice-state', handleVoiceState as EventListener);
    return () => window.removeEventListener('elevenlabs-voice-state', handleVoiceState as EventListener);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // PWA install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setPwaInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handler as EventListener);
    return () => window.removeEventListener('beforeinstallprompt', handler as EventListener);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (isOpen && !target.closest('.floating-action-menu')) {
        setIsOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [isOpen]);

  const handleWhatsAppClick = () => {
    lightTap();
    trackWhatsApp();
    const message = encodeURIComponent(t.floatingWhatsapp.message);
    window.open(`https://wa.me/40723154520?text=${message}`, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  const handleScrollToTop = () => {
    lightTap();
    window.scrollTo({ top: 0, behavior: "smooth" });
    setIsOpen(false);
  };

  const handleVoiceClick = async () => {
    lightTap();
    setIsOpen(false);
    
    if (voiceConnected) {
      window.dispatchEvent(new CustomEvent('elevenlabs-toggle-voice'));
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } 
      });
      window.dispatchEvent(new CustomEvent('elevenlabs-toggle-voice', { detail: { stream } }));
    } catch (error: any) {
      console.error("[FloatingActionMenu] Microphone access error:", error);
      const { toast } = await import("sonner");
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        toast.error(
          language === "ro"
            ? "Vă rugăm să permiteți accesul la microfon din setările browser-ului."
            : "Please allow microphone access in your browser settings."
        );
      } else if (error.name === "NotFoundError") {
        toast.error(
          language === "ro"
            ? "Nu s-a detectat niciun microfon."
            : "No microphone detected."
        );
      } else {
        toast.error(
          language === "ro"
            ? "Eroare la accesarea microfonului."
            : "Error accessing microphone."
        );
      }
    }
  };

  const toggleMenu = () => {
    mediumTap();
    setIsOpen(!isOpen);
  };

  // Streamlined menu — only high-value actions, grouped logically
  const menuItems = [
    // Primary: WhatsApp (conversion)
    {
      id: "whatsapp",
      icon: MessageCircle,
      label: "WhatsApp",
      onClick: handleWhatsAppClick,
      bgColor: "bg-whatsapp",
      textColor: "text-whatsapp-foreground",
    },
    // AI features
    ...(showVoice ? [{
      id: "voice",
      icon: voiceConnecting ? Loader2 : (voiceConnected ? MicOff : Mic),
      label: voiceConnected 
        ? (voiceSpeaking 
            ? (language === 'ro' ? "Vorbește..." : "Speaking...") 
            : (language === 'ro' ? "Oprește" : "Stop"))
        : (language === 'ro' ? "Concierge Vocal" : "Voice Concierge"),
      onClick: handleVoiceClick,
      bgColor: voiceConnected ? "bg-destructive" : "bg-gradient-to-br from-purple-600 to-primary",
      textColor: "text-white",
      isAnimating: voiceConnecting,
    }] : []),
    ...(showChatbot ? [{
      id: "chatbot",
      icon: Bot,
      label: language === 'ro' ? "Concierge AI" : "AI Concierge",
      onClick: () => {
        lightTap();
        window.dispatchEvent(new CustomEvent('open-ai-chatbot'));
        setIsOpen(false);
      },
      bgColor: "bg-gradient-to-br from-primary to-primary/80",
      textColor: "text-primary-foreground",
    }] : []),
    // Utilities
    {
      id: "referral",
      icon: Gift,
      label: language === 'ro' ? "Weekend Gratuit" : "Free Weekend",
      onClick: () => {
        lightTap();
        window.dispatchEvent(new CustomEvent('open-referral-popup'));
        setIsOpen(false);
      },
      bgColor: "bg-gradient-to-r from-amber-500 to-orange-500",
      textColor: "text-white",
    },
    // Calculator ROI
    {
      id: "calculator",
      icon: Calculator,
      label: language === 'ro' ? "Calculator ROI" : "ROI Calculator",
      onClick: () => {
        lightTap();
        window.dispatchEvent(new CustomEvent('open-inline-calculator'));
        setIsOpen(false);
      },
      bgColor: "bg-gradient-to-br from-emerald-600 to-emerald-500",
      textColor: "text-white",
    },
    // PWA Install (only when available)
    ...(pwaInstallable ? [{
      id: "pwa-install",
      icon: Download,
      label: language === 'ro' ? "Instalează App" : "Install App",
      onClick: async () => {
        lightTap();
        if (deferredPrompt) {
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          if (outcome === 'accepted') {
            setPwaInstallable(false);
            setDeferredPrompt(null);
          }
        }
        setIsOpen(false);
      },
      bgColor: "bg-gradient-to-br from-blue-600 to-blue-500",
      textColor: "text-white",
    }] : []),
    {
      id: "accessibility",
      icon: Accessibility,
      label: language === 'ro' ? "Accesibilitate" : "Accessibility",
      onClick: () => {
        lightTap();
        window.dispatchEvent(new CustomEvent('toggle-accessibility-panel'));
        setIsOpen(false);
      },
      bgColor: "bg-primary",
      textColor: "text-primary-foreground",
    },
    // Scroll to top — always last
    {
      id: "scroll-top",
      icon: ChevronUp,
      label: language === 'ro' ? "Sus" : "Top",
      onClick: handleScrollToTop,
      bgColor: "bg-muted",
      textColor: "text-foreground",
    },
  ];

  return (
    <div className="floating-action-menu fixed bottom-20 right-3 md:bottom-6 md:right-4 z-50">
      <AnimatePresence>
        {isVisible && (
          <>
            {/* Menu Items */}
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute bottom-16 right-0 flex flex-col-reverse gap-2.5 items-end"
                >
                  {menuItems.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 16, scale: 0.85 }}
                      animate={{ 
                        opacity: 1, 
                        y: 0, 
                        scale: 1,
                        transition: { delay: index * 0.04, type: "spring", stiffness: 400, damping: 25 }
                      }}
                      exit={{ 
                        opacity: 0, 
                        y: 12, 
                        scale: 0.85,
                        transition: { delay: (menuItems.length - index - 1) * 0.02, duration: 0.15 }
                      }}
                      className="flex items-center gap-2"
                    >
                      {/* Label */}
                      <motion.span
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0, transition: { delay: index * 0.04 + 0.08 } }}
                        exit={{ opacity: 0, x: 8, transition: { duration: 0.1 } }}
                        className="px-3 py-1.5 bg-card/95 backdrop-blur-md border border-border/50 rounded-full text-xs font-medium text-foreground shadow-md whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                      
                      {/* Button */}
                      <button
                        onClick={item.onClick}
                        aria-label={item.label}
                        className={cn(
                          "w-11 h-11 rounded-full flex items-center justify-center shadow-md",
                          "hover:scale-105 active:scale-95 transition-transform duration-150",
                          item.bgColor,
                          item.textColor
                        )}
                      >
                        <item.icon className={cn("w-[18px] h-[18px]", (item as any).isAnimating && "animate-spin")} />
                      </button>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main FAB Button */}
            <motion.button
              initial={{ opacity: 0, scale: 0.8, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 16 }}
              onClick={(e) => {
                e.stopPropagation();
                toggleMenu();
              }}
              className={cn(
                "relative w-12 h-12 rounded-full shadow-lg flex items-center justify-center",
                "transition-all duration-300 active:scale-95",
                isOpen 
                  ? "bg-card border border-border text-foreground" 
                  : "bg-primary text-primary-foreground shadow-primary/25"
              )}
              aria-label={isOpen ? (language === 'ro' ? "Închide meniu" : "Close menu") : (language === 'ro' ? "Meniu rapid" : "Quick menu")}
            >
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.25, type: "spring", stiffness: 400 }}
              >
                {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </motion.div>
            </motion.button>

            {/* Backdrop */}
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/30 backdrop-blur-[2px] -z-10"
                  onClick={() => setIsOpen(false)}
                />
              )}
            </AnimatePresence>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FloatingActionMenu;
