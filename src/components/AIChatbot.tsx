import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Bot, User, Sparkles, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import HCaptcha from "@hcaptcha/react-hcaptcha";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const AIChatbot = () => {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const captchaRef = useRef<HCaptcha>(null);
  
  // CAPTCHA state
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaSiteKey, setCaptchaSiteKey] = useState<string>("");
  const [captchaLoading, setCaptchaLoading] = useState(true);
  const [captchaVerified, setCaptchaVerified] = useState(false);

  const t = {
    ro: {
      title: "Asistent Virtual",
      subtitle: "Răspundem instant la întrebările tale",
      placeholder: "Scrie mesajul tău...",
      greeting: "Bună! 👋 Sunt asistentul virtual ApArt Hotel. Cum te pot ajuta astăzi? Pot răspunde la întrebări despre:\n\n• Disponibilitate și prețuri\n• Facilitățile apartamentelor\n• Procesul de rezervare\n• Zona Timișoara\n• Servicii pentru proprietari",
      thinking: "Gândesc...",
      error: "A apărut o eroare. Te rog încearcă din nou.",
      poweredBy: "Powered by AI",
      captchaRequired: "Te rog completează verificarea de securitate pentru a putea trimite mesaje.",
      captchaVerified: "Verificare completă",
      verifySecurity: "Verifică pentru a trimite mesaje",
    },
    en: {
      title: "Virtual Assistant",
      subtitle: "We respond instantly to your questions",
      placeholder: "Type your message...",
      greeting: "Hello! 👋 I'm the ApArt Hotel virtual assistant. How can I help you today? I can answer questions about:\n\n• Availability and prices\n• Apartment facilities\n• Booking process\n• Timișoara area\n• Services for owners",
      thinking: "Thinking...",
      error: "An error occurred. Please try again.",
      poweredBy: "Powered by AI",
      captchaRequired: "Please complete the security verification to send messages.",
      captchaVerified: "Verification complete",
      verifySecurity: "Verify to send messages",
    },
  };

  const text = t[language as keyof typeof t] || t.ro;

  // Fetch hCaptcha site key
  useEffect(() => {
    const fetchSiteKey = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-hcaptcha-site-key");
        if (!error && data?.siteKey) {
          setCaptchaSiteKey(data.siteKey);
        }
      } catch (err) {
        console.error("Failed to fetch hCaptcha site key:", err);
      } finally {
        setCaptchaLoading(false);
      }
    };
    fetchSiteKey();
  }, []);

  // Initialize with greeting message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: "greeting",
          role: "assistant",
          content: text.greeting,
          timestamp: new Date(),
        },
      ]);
    }
  }, []);

  // Show initial notification after delay
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isOpen && messages.length <= 1) {
        setHasUnread(true);
      }
    }, 15000);

    return () => clearTimeout(timer);
  }, [isOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current && captchaVerified) {
      inputRef.current.focus();
    }
  }, [isOpen, captchaVerified]);

  // Listen for custom event from FloatingActionMenu
  useEffect(() => {
    const handleOpenChatbot = () => {
      setIsOpen(true);
      setHasUnread(false);
    };

    window.addEventListener('open-ai-chatbot', handleOpenChatbot);
    return () => window.removeEventListener('open-ai-chatbot', handleOpenChatbot);
  }, []);

  const handleCaptchaVerify = useCallback((token: string) => {
    setCaptchaToken(token);
    setCaptchaVerified(true);
    console.log("CAPTCHA verified for AI chatbot");
  }, []);

  const handleCaptchaExpire = useCallback(() => {
    setCaptchaToken(null);
    setCaptchaVerified(false);
  }, []);

  const handleOpen = () => {
    setIsOpen(true);
    setHasUnread(false);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !captchaVerified || !captchaToken) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-chatbot", {
        body: {
          message: userMessage.content,
          language,
          captchaToken,
          conversationHistory: messages.slice(-10).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response || text.error,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chatbot error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: text.error,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Chat Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 20 }}
            onClick={handleOpen}
            className="fixed bottom-[136px] right-4 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg hover:shadow-xl hover:scale-110 transition-all hidden md:flex items-center justify-center group"
          >
            <MessageCircle className="w-6 h-6" />
            
            {/* Unread indicator */}
            {hasUnread && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center"
              >
                <span className="text-[10px] text-destructive-foreground font-bold">1</span>
              </motion.div>
            )}

            {/* Pulse effect */}
            <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25 }}
            className="fixed bottom-4 right-4 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-6rem)] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">{text.title}</h3>
                  <p className="text-xs text-muted-foreground">{text.subtitle}</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-full hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        message.role === "user"
                          ? "bg-secondary"
                          : "bg-gradient-to-br from-primary to-primary/60"
                      }`}
                    >
                      {message.role === "user" ? (
                        <User className="w-4 h-4 text-foreground" />
                      ) : (
                        <Bot className="w-4 h-4 text-primary-foreground" />
                      )}
                    </div>
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-foreground"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </motion.div>
                ))}

                {/* Loading indicator */}
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <div className="bg-secondary rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">{text.thinking}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </ScrollArea>

            {/* CAPTCHA & Input */}
            <div className="p-4 border-t border-border shrink-0">
              {/* CAPTCHA Section */}
              {!captchaVerified && captchaSiteKey && (
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground mb-2 text-center">
                    {text.verifySecurity}
                  </p>
                  <div className="flex justify-center">
                    <HCaptcha
                      ref={captchaRef}
                      sitekey={captchaSiteKey}
                      onVerify={handleCaptchaVerify}
                      onExpire={handleCaptchaExpire}
                      size="compact"
                    />
                  </div>
                </div>
              )}

              {/* Verified badge */}
              {captchaVerified && (
                <div className="flex items-center justify-center gap-1 mb-2 text-xs text-primary">
                  <ShieldCheck className="w-3 h-3" />
                  {text.captchaVerified}
                </div>
              )}

              {/* Loading CAPTCHA */}
              {captchaLoading && !captchaSiteKey && (
                <div className="flex items-center justify-center gap-2 mb-3 text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Loading security...
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={captchaVerified ? text.placeholder : text.captchaRequired}
                  className="flex-1"
                  disabled={isLoading || !captchaVerified}
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading || !captchaVerified}
                  size="icon"
                  className="shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center justify-center gap-1 mt-2 text-[10px] text-muted-foreground">
                <Sparkles className="w-3 h-3" />
                {text.poweredBy}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIChatbot;
