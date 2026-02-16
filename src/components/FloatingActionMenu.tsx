import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
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
  Loader2
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

  const referralText = {
    ro: "Weekend gratuit",
    en: "Free weekend",
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
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
    window.open(`https://wa.me/40723154520?text=${message}`, "_blank");
    setIsOpen(false);
  };

  const handleScrollToTop = () => {
    lightTap();
    window.scrollTo({ top: 0, behavior: "smooth" });
    setIsOpen(false);
  };

  const handleVoiceClick = () => {
    lightTap();
    window.dispatchEvent(new CustomEvent('elevenlabs-toggle-voice'));
    setIsOpen(false);
  };

  const toggleMenu = () => {
    mediumTap();
    setIsOpen(!isOpen);
  };

  const menuItems = [
    {
      id: "whatsapp",
      icon: MessageCircle,
      label: "WhatsApp",
      onClick: handleWhatsAppClick,
      bgColor: "bg-[#25D366]",
      textColor: "text-white",
    },
    {
      id: "scroll-top",
      icon: ChevronUp,
      label: language === 'ro' ? "Sus" : "Top",
      onClick: handleScrollToTop,
      bgColor: "bg-primary",
      textColor: "text-primary-foreground",
    },
    ...(showVoice ? [{
      id: "voice",
      icon: voiceConnecting ? Loader2 : (voiceConnected ? MicOff : Mic),
      label: voiceConnected 
        ? (voiceSpeaking 
            ? (language === 'ro' ? "Vorbește..." : "Speaking...") 
            : (language === 'ro' ? "Oprește" : "Stop"))
        : (language === 'ro' ? "Voce AI" : "AI Voice"),
      onClick: handleVoiceClick,
      bgColor: voiceConnected ? "bg-red-500" : "bg-gradient-to-br from-purple-600 to-primary",
      textColor: "text-white",
      isAnimating: voiceConnecting,
    }] : []),
    ...(showChatbot ? [{
      id: "chatbot",
      icon: Bot,
      label: "AI Chat",
      onClick: () => {
        lightTap();
        window.dispatchEvent(new CustomEvent('open-ai-chatbot'));
        setIsOpen(false);
      },
      bgColor: "bg-gradient-to-br from-primary to-primary/80",
      textColor: "text-primary-foreground",
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
    {
      id: "referral",
      icon: Gift,
      label: referralText[language as keyof typeof referralText] || referralText.ro,
      to: "/recomanda-proprietar",
      bgColor: "bg-gradient-to-r from-amber-500 to-orange-500",
      textColor: "text-white",
    },
  ];

  return (
    <div className="floating-action-menu fixed bottom-6 right-4 z-50 md:hidden">
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
                  className="absolute bottom-16 right-0 flex flex-col-reverse gap-3 items-end"
                >
                  {menuItems.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20, scale: 0.8 }}
                      animate={{ 
                        opacity: 1, 
                        y: 0, 
                        scale: 1,
                        transition: { delay: index * 0.05 }
                      }}
                      exit={{ 
                        opacity: 0, 
                        y: 20, 
                        scale: 0.8,
                        transition: { delay: (menuItems.length - index - 1) * 0.03 }
                      }}
                      className="flex items-center gap-2"
                    >
                      {/* Label */}
                      <motion.span
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0, transition: { delay: index * 0.05 + 0.1 } }}
                        exit={{ opacity: 0, x: 10 }}
                        className="px-3 py-1.5 bg-card border border-border rounded-full text-sm font-medium text-foreground shadow-lg whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                      
                      {/* Button */}
                      {item.to ? (
                        <Link
                          to={item.to}
                          onClick={() => setIsOpen(false)}
                          className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform",
                            item.bgColor,
                            item.textColor
                          )}
                        >
                          <item.icon className="w-5 h-5" />
                        </Link>
                      ) : (
                        <button
                          onClick={item.onClick}
                          className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform",
                            item.bgColor,
                            item.textColor
                          )}
                        >
                          <item.icon className={cn("w-5 h-5", (item as any).isAnimating && "animate-spin")} />
                        </button>
                      )}
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main FAB Button */}
            <motion.button
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              onClick={(e) => {
                e.stopPropagation();
                toggleMenu();
              }}
              className={cn(
                "w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300",
                isOpen 
                  ? "bg-muted text-foreground rotate-0" 
                  : "bg-primary text-primary-foreground"
              )}
            >
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </motion.div>
            </motion.button>

            {/* Backdrop */}
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
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
