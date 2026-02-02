     import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Bot, User, Sparkles, Loader2, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/i18n/LanguageContext";
import ReactMarkdown from "react-markdown";
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
  
  // CAPTCHA state - FORCED TO TRUE TO UNLOCK CHAT
  const [captchaVerified, setCaptchaVerified] = useState(true);

  const t = {
    ro: {
      title: "Asistent AI Premium",
      subtitle: "Răspunsuri instant cu AI avansat",
      placeholder: "Scrie mesajul tău...",
      greeting: "Bună! 👋 Sunt asistentul AI premium ApArt Hotel.\n\n**Ce pot face pentru tine:**\n\n• 📅 Verifică **disponibilitatea** apartamentelor\n• 💰 Calculează **prețuri** pentru sejur\n• 📊 Estimează **profit** pentru proprietari\n• ℹ️ Informații despre **facilități**\n\nCum te pot ajuta?",
      thinking: "Analizez...",
      error: "A apărut o eroare. Te rog încearcă din nou.",
      poweredBy: "Gemini 2.5 Pro",
    },
    en: {
      title: "Premium AI Assistant",
      subtitle: "Instant responses with advanced AI",
      placeholder: "Type your message...",
      greeting: "Hello! 👋 I'm ApArt Hotel's premium AI assistant.\n\n**What I can do for you:**\n\n• 📅 Check apartment **availability**\n• 💰 Calculate **prices** for stays\n• 📊 Estimate **profit** for owners\n• ℹ️ Information about **amenities**\n\nHow can I help you?",
      thinking: "Analyzing...",
      error: "An error occurred. Please try again.",
      poweredBy: "Gemini 2.5 Pro",
    },
  };

  const text = t[language as keyof typeof t] || t.ro;

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
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleOpen = () => {
    setIsOpen(true);
    setHasUnread(false);
  };

  const handleSend = async () => {
    // Removed captchaToken check to allow sending
    if (!input.trim() || isLoading) return;

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
          // We send a dummy token if the backend still expects it, 
          // but since you disabled it in Supabase, it should be fine.
          captchaToken: "manual_bypass", 
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
            if (parsed.delta) {
              fullContent += parsed.delta;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId ? { ...m, content: fullContent } : m
                )
              );
            }
          } catch (e) { }
        }
      }

      setMessages((prev) =>
        prev.map((m) => m.id === assistantMessageId ? { ...m, isStreaming: false } : m)
      );
    } catch (error) {
      console.error("Chatbot stream error:", error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId ? { ...m, content: text.error, isStreaming: false } : m
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

  const MarkdownContent = ({ content }: { content: string }) => (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-primary">{children}</strong>,
        ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
        li: ({ children }) => <li className="ml-2">{children}</li>,
      }}
    >
      {content}
    </ReactMarkdown>
  );

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={handleOpen}
            className="fixed bottom-[136px] right-4 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg hidden md:flex items-center justify-center group"
          >
            <MessageCircle className="w-6 h-6" />
            {hasUnread && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center">
                <span className="text-[10px] text-destructive-foreground font-bold">1</span>
              </div>
            )}
            <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-20 md:bottom-4 right-2 md:right-4 left-2 md:left-auto z-50 w-auto md:w-[400px] h-[70vh] md:h-[550px] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-amber-500/10 border-b border-border p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">{text.title}</h3>
                  <p className="text-xs text-muted-foreground">{text.subtitle}</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 rounded-full hover:bg-muted">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${message.role === "user" ? "bg-secondary" : "bg-primary"}`}>
                      {message.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-primary-foreground" />}
                    </div>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                      <MarkdownContent content={message.content} />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-border bg-background">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={text.placeholder}
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button onClick={handleSend} disabled={!input.trim() || isLoading} size="icon">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center justify-center gap-1.5 mt-2 text-[10px] text-muted-foreground">
                <Sparkles className="w-3 h-3 text-primary" />
                <span className="text-primary font-medium">{text.poweredBy}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIChatbot;
                 
