import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Bot, User, Sparkles, Loader2, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/i18n/LanguageContext";
import ReactMarkdown from "react-markdown";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

const STREAM_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chatbot-stream`;

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
      title: "Asistent AI Premium",
      subtitle: "Răspunsuri instant cu AI avansat",
      placeholder: "Scrie mesajul tău...",
      greeting: "Bună! 👋 Sunt asistentul AI premium ApArt Hotel.\n\n**Ce pot face pentru tine:**\n\n• 📅 Verifică **disponibilitatea** apartamentelor\n• 💰 Calculează **prețuri** pentru sejur\n• 📊 Estimează **profit** pentru proprietari\n• ℹ️ Informații despre **facilități**\n\nCum te pot ajuta?",
      thinking: "Analizez...",
      error: "A apărut o eroare. Te rog încearcă din nou.",
      poweredBy: "Gemini 2.5 Pro",
      captchaRequired: "Completează verificarea pentru a trimite.",
      captchaVerified: "Verificat",
      verifySecurity: "Verifică pentru a trimite mesaje",
    },
    en: {
      title: "Premium AI Assistant",
      subtitle: "Instant responses with advanced AI",
      placeholder: "Type your message...",
      greeting: "Hello! 👋 I'm ApArt Hotel's premium AI assistant.\n\n**What I can do for you:**\n\n• 📅 Check apartment **availability**\n• 💰 Calculate **prices** for stays\n• 📊 Estimate **profit** for owners\n• ℹ️ Information about **amenities**\n\nHow can I help you?",
      thinking: "Analyzing...",
      error: "An error occurred. Please try again.",
      poweredBy: "Gemini 2.5 Pro",
      captchaRequired: "Complete verification to send.",
      captchaVerified: "Verified",
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

  // Streaming message handler
  const handleSend = async () => {
    if (!input.trim() || isLoading || !captchaVerified || !captchaToken) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    const assistantMessageId = (Date.now() + 1).toString();

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Add empty assistant message for streaming
    setMessages((prev) => [
      ...prev,
      {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isStreaming: true,
      },
    ]);

    try {
      const response = await fetch(STREAM_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          message: userMessage.content,
          language,
          captchaToken,
          conversationHistory: messages.slice(-10).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Stream failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            
            if (parsed.error) {
              console.error("Stream error:", parsed.error);
              throw new Error(parsed.error);
            }

            if (parsed.delta) {
              fullContent += parsed.delta;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId
                    ? { ...m, content: fullContent }
                    : m
                )
              );
            }
          } catch (e) {
            // Incomplete JSON, continue
          }
        }
      }

      // Mark streaming as complete
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? { ...m, isStreaming: false }
            : m
        )
      );
    } catch (error) {
      console.error("Chatbot stream error:", error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? { ...m, content: text.error, isStreaming: false }
            : m
        )
      );
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

  // Markdown components for styling
  const MarkdownContent = ({ content }: { content: string }) => (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-primary">{children}</strong>,
        ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
        li: ({ children }) => <li className="ml-2">{children}</li>,
        a: ({ href, children }) => (
          <a 
            href={href} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary underline hover:text-primary/80 transition-colors"
          >
            {children}
          </a>
        ),
        h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
        h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
        code: ({ children }) => (
          <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-primary pl-3 italic my-2">{children}</blockquote>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );

  return (
    <>
      {/* Chat Button - Desktop only, hidden when menu is open on mobile */}
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
            
            {/* Premium badge */}
            <div className="absolute -top-1 -left-1 w-5 h-5 bg-gradient-to-r from-primary to-accent rounded-full flex items-center justify-center">
              <Zap className="w-3 h-3 text-primary-foreground" />
            </div>
            
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
            className="fixed bottom-20 md:bottom-4 right-2 md:right-4 left-2 md:left-auto z-50 w-auto md:w-[400px] max-w-full md:max-w-[calc(100vw-2rem)] h-[70vh] md:h-[550px] max-h-[calc(100vh-8rem)] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-amber-500/10 border-b border-border p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-gradient-to-r from-primary to-accent rounded-full flex items-center justify-center">
                    <Zap className="w-2.5 h-2.5 text-primary-foreground" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                    {text.title}
                  </h3>
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
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-foreground"
                      }`}
                    >
                      {message.role === "assistant" ? (
                        <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                          <MarkdownContent content={message.content} />
                          {message.isStreaming && (
                            <span className="inline-block w-2 h-4 bg-primary/60 animate-pulse ml-0.5" />
                          )}
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      )}
                    </div>
                  </motion.div>
                ))}

                {/* Loading indicator - only show when no streaming message exists */}
                {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
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
            <div className="p-4 border-t border-border shrink-0 bg-gradient-to-t from-background to-transparent">
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
                  className="shrink-0 bg-gradient-to-r from-primary to-primary/80"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center justify-center gap-1.5 mt-2 text-[10px] text-muted-foreground">
                <Sparkles className="w-3 h-3 text-primary" />
                <span className="text-primary font-medium">
                  {text.poweredBy}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIChatbot;
