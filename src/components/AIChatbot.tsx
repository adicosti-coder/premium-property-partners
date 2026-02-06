import { useState, useRef, useEffect, useCallback, forwardRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageCircle, X, Send, Bot, User, Sparkles, Loader2, 
  Calendar, Calculator, HelpCircle, RotateCcw, 
  Copy, Check, ExternalLink, Volume2, VolumeX, Minimize2, Mic, MicOff, Phone, PhoneOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/i18n/LanguageContext";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase, supabaseConfig, getSupabasePublishableKey } from "@/lib/supabaseClient";
import { useConversation } from "@elevenlabs/react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  isError?: boolean;
}

interface QuickAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  prompt: string;
}

// Backend function endpoint (env or bootstrap fallback)
const STREAM_URL = `${supabaseConfig.url}/functions/v1/ai-chatbot-stream`;

// Memoized Markdown renderer with forwardRef to fix React warning
const MarkdownContent = memo(forwardRef<HTMLDivElement, { content: string; isStreaming?: boolean }>(
  ({ content, isStreaming }, ref) => (
    <div ref={ref} className="prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-primary">{children}</strong>,
          ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="ml-2">{children}</li>,
          a: ({ href, children }) => (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-primary underline underline-offset-2 hover:text-primary/80 inline-flex items-center gap-1"
            >
              {children}
              <ExternalLink className="w-3 h-3" />
            </a>
          ),
          code: ({ children }) => (
            <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
          ),
          h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span className="inline-block w-2 h-4 bg-primary/60 animate-pulse ml-0.5 rounded-sm" />
      )}
    </div>
  )
));

MarkdownContent.displayName = "MarkdownContent";

// Typing indicator component
const TypingIndicator = () => (
  <div className="flex gap-1.5 items-center px-4 py-3">
    <div className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-primary/60"
          animate={{ y: [0, -4, 0] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
    <span className="text-xs text-muted-foreground ml-2">Analizez...</span>
  </div>
);

// Voice visualizer component
const VoiceVisualizer = ({ isActive, isSpeaking }: { isActive: boolean; isSpeaking: boolean }) => (
  <div className="flex items-center justify-center gap-1 h-8">
    {[0, 1, 2, 3, 4].map((i) => (
      <motion.div
        key={i}
        className={cn(
          "w-1 rounded-full",
          isSpeaking ? "bg-primary" : isActive ? "bg-primary/60" : "bg-muted"
        )}
        animate={{
          height: isActive 
            ? isSpeaking 
              ? [8, 20 + Math.random() * 12, 8]
              : [4, 8, 4]
            : 4,
        }}
        transition={{
          duration: 0.4,
          repeat: Infinity,
          delay: i * 0.1,
        }}
      />
    ))}
  </div>
);

const AIChatbot = () => {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [voiceMode, setVoiceMode] = useState(false);
  const [isConnectingVoice, setIsConnectingVoice] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const addMessage = useCallback((role: "user" | "assistant", content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role,
        content,
        timestamp: new Date(),
      },
    ]);
  }, []);

  // ElevenLabs conversation hook
  const conversation = useConversation({
    onConnect: () => {
      console.log("[AIChatbot] Voice connected");
      setIsConnectingVoice(false);
      toast.success(language === "ro" ? "Mod vocal activat!" : "Voice mode activated!");
    },
    onDisconnect: () => {
      console.log("[AIChatbot] Voice disconnected");
      setVoiceMode(false);
      setIsConnectingVoice(false);
    },
    onMessage: (payload) => {
      // This callback receives finalized messages with role and message text
      console.log("[AIChatbot] Voice message:", payload);
      if (payload.role === "user") {
        addMessage("user", payload.message);
      } else if (payload.role === "agent") {
        addMessage("assistant", payload.message);
      }
    },
    onError: (error) => {
      console.error("[AIChatbot] Voice error:", error);
      setVoiceMode(false);
      setIsConnectingVoice(false);
      toast.error(language === "ro" ? "Eroare la conexiunea vocală" : "Voice connection error");
    },
  });

  const t = {
    ro: {
      title: "Asistent AI Premium",
      subtitle: "Răspunsuri instant cu AI avansat",
      placeholder: "Scrie mesajul tău...",
      greeting: "Bună! 👋 Sunt asistentul AI premium ApArt Hotel.\n\n**Ce pot face pentru tine:**\n\n• 📅 Verifică **disponibilitatea** apartamentelor\n• 💰 Calculează **prețuri** pentru sejur\n• 📊 Estimează **profit** pentru proprietari\n• 🗓️ **Programează** vizionări sau evaluări\n• 🍽️ **Recomandări** restaurante, cafenele, atracții\n\nCum te pot ajuta?",
      thinking: "Analizez...",
      error: "A apărut o eroare. Te rog încearcă din nou.",
      errorNetwork: "Conexiune întreruptă. Verifică internetul.",
      errorRateLimit: "Prea multe cereri. Așteaptă un moment.",
      poweredBy: "Gemini 2.5 Pro",
      quickActions: {
        availability: "Verifică disponibilitate",
        price: "Calculează preț",
        schedule: "Programează vizită",
        recommend: "Recomandări locale",
      },
      copied: "Copiat!",
      newChat: "Conversație nouă",
      retry: "Încearcă din nou",
      voiceMode: "Activează mod vocal",
      voiceModeActive: "Mod vocal activ",
      voiceListening: "Ascult...",
      voiceSpeaking: "Vorbesc...",
      endCall: "Închide apelul",
    },
    en: {
      title: "Premium AI Assistant",
      subtitle: "Instant responses with advanced AI",
      placeholder: "Type your message...",
      greeting: "Hello! 👋 I'm ApArt Hotel's premium AI assistant.\n\n**What I can do for you:**\n\n• 📅 Check apartment **availability**\n• 💰 Calculate **prices** for stays\n• 📊 Estimate **profit** for owners\n• 🗓️ **Schedule** viewings or evaluations\n• 🍽️ **Recommendations** for restaurants, cafes, attractions\n\nHow can I help you?",
      thinking: "Analyzing...",
      error: "An error occurred. Please try again.",
      errorNetwork: "Connection lost. Check your internet.",
      errorRateLimit: "Too many requests. Please wait.",
      poweredBy: "Gemini 2.5 Pro",
      quickActions: {
        availability: "Check availability",
        price: "Calculate price",
        schedule: "Schedule visit",
        recommend: "Local tips",
      },
      copied: "Copied!",
      newChat: "New chat",
      retry: "Try again",
      voiceMode: "Activate voice mode",
      voiceModeActive: "Voice mode active",
      voiceListening: "Listening...",
      voiceSpeaking: "Speaking...",
      endCall: "End call",
    },
  };

  const text = t[language as keyof typeof t] || t.ro;

  const quickActions: QuickAction[] = [
    {
      id: "availability",
      icon: <Calendar className="w-3.5 h-3.5" />,
      label: text.quickActions.availability,
      prompt: language === "ro" 
        ? "Vreau să verific disponibilitatea apartamentelor pentru perioada următoare" 
        : "I want to check apartment availability for the next period",
    },
    {
      id: "price",
      icon: <Calculator className="w-3.5 h-3.5" />,
      label: text.quickActions.price,
      prompt: language === "ro" 
        ? "Calculează prețul pentru un sejur de 3 nopți" 
        : "Calculate the price for a 3-night stay",
    },
    {
      id: "schedule",
      icon: <Calendar className="w-3.5 h-3.5" />,
      label: text.quickActions.schedule,
      prompt: language === "ro" 
        ? "Vreau să programez o vizionare a unui apartament sau o evaluare gratuită a proprietății mele" 
        : "I want to schedule an apartment viewing or a free evaluation of my property",
    },
    {
      id: "recommend",
      icon: <HelpCircle className="w-3.5 h-3.5" />,
      label: text.quickActions.recommend,
      prompt: language === "ro" 
        ? "Ce restaurante și cafenele îmi recomanzi în Timișoara?" 
        : "What restaurants and cafes do you recommend in Timișoara?",
    },
  ];

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
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current && !voiceMode) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized, voiceMode]);

  // Listen for custom event to open chatbot from FloatingActionMenu
  useEffect(() => {
    const handleOpenChatbot = () => {
      setIsOpen(true);
      setIsMinimized(false);
      setHasUnread(false);
    };

    window.addEventListener('open-ai-chatbot', handleOpenChatbot);
    return () => window.removeEventListener('open-ai-chatbot', handleOpenChatbot);
  }, []);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      // End voice conversation if active
      if (conversation.status === "connected") {
        conversation.endSession();
      }
    };
  }, []);

  const playSound = useCallback(() => {
    if (soundEnabled) {
      // Simple notification sound using Web Audio API
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = "sine";
        gainNode.gain.value = 0.1;
        
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        oscillator.stop(audioContext.currentTime + 0.1);
      } catch (e) {
        // Audio not supported
      }
    }
  }, [soundEnabled]);

  const startVoiceMode = async () => {
    setIsConnectingVoice(true);
    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Get token from edge function with language parameter
      const { data, error } = await supabase.functions.invoke("elevenlabs-conversation-token", {
        body: { language },
      });

      if (error || !data?.token) {
        console.error("[AIChatbot] Failed to get voice token:", error);
        throw new Error("Failed to get voice token");
      }

      console.log("[AIChatbot] Starting voice with agent:", data.agentId);

      // Start the conversation with WebRTC
      await conversation.startSession({
        conversationToken: data.token,
        connectionType: "webrtc",
      });

      setVoiceMode(true);
    } catch (error: any) {
      console.error("[AIChatbot] Voice mode error:", error);
      setIsConnectingVoice(false);
      
      if (error.name === "NotAllowedError" || error.message?.includes("microphone")) {
        toast.error(language === "ro" 
          ? "Permite accesul la microfon pentru modul vocal" 
          : "Allow microphone access for voice mode"
        );
      } else {
        toast.error(language === "ro" 
          ? "Nu s-a putut activa modul vocal" 
          : "Could not activate voice mode"
        );
      }
    }
  };

  const endVoiceMode = async () => {
    await conversation.endSession();
    setVoiceMode(false);
  };

  const handleOpen = () => {
    setIsOpen(true);
    setIsMinimized(false);
    setHasUnread(false);
  };

  const handleMinimize = () => {
    setIsMinimized(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsMinimized(false);
    // Cancel ongoing request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    // End voice mode if active
    if (voiceMode) {
      endVoiceMode();
    }
  };

  const handleNewChat = () => {
    setMessages([
      {
        id: "greeting-" + Date.now(),
        role: "assistant",
        content: text.greeting,
        timestamp: new Date(),
      },
    ]);
    // End voice mode on new chat
    if (voiceMode) {
      endVoiceMode();
    }
  };

  const handleCopyMessage = async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      toast.success(text.copied);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (e) {
      console.error("Failed to copy:", e);
    }
  };

  const handleRetry = (messageContent: string) => {
    // Remove the last assistant message (error) and retry
    setMessages((prev) => prev.filter((m) => !m.isError));
    setInput(messageContent);
  };

  const handleQuickAction = (action: QuickAction) => {
    setInput(action.prompt);
    // Auto-send after a brief delay to show the action
    setTimeout(() => {
      handleSend(action.prompt);
    }, 100);
  };

  const handleSend = async (overrideMessage?: string) => {
    const messageToSend = overrideMessage || input.trim();
    if (!messageToSend || isLoading) return;

    // Cancel previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageToSend,
      timestamp: new Date(),
    };

    const assistantMessageId = (Date.now() + 1).toString();

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Add placeholder for assistant response
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
      const apiKey = getSupabasePublishableKey();
      // Allow fallback mode since it now uses valid production credentials
      if (!apiKey || apiKey === "invalid-publishable-key") {
        throw new Error("missing_env");
      }
      
      console.log("[AIChatbot] Sending request to:", STREAM_URL);
      
      const response = await fetch(STREAM_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          // Some environments require explicit apikey header for Functions gateway
          "apikey": apiKey,
          "Accept": "text/event-stream",
        },
        body: JSON.stringify({
          message: messageToSend,
          language,
          conversationHistory: messages.slice(-10).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
        signal: abortControllerRef.current.signal,
      });

      console.log("[AIChatbot] Response status:", response.status);

      if (!response.ok) {
        console.error("[AIChatbot] Response not OK:", response.status, response.statusText);
        if (response.status === 429) {
          throw new Error("rate_limit");
        }
        throw new Error("network");
      }

      if (!response.body) {
        throw new Error("no_body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";
      let hasReceivedContent = false;
      let streamCompleted = false;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            streamCompleted = true;
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          
          let newlineIndex: number;
          while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);

            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") {
              streamCompleted = true;
              break;
            }

            try {
              const parsed = JSON.parse(jsonStr);
              
              // Handle errors from the stream
              if (parsed.error) {
                if (parsed.error === "rate_limit" || parsed.error === "ai_rate_limit") {
                  throw new Error("rate_limit");
                }
                throw new Error(parsed.error);
              }
              
              if (parsed.delta) {
                fullContent += parsed.delta;
                hasReceivedContent = true;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId 
                      ? { ...m, content: fullContent } 
                      : m
                  )
                );
              }
            } catch (e) {
              if (e instanceof Error && (e.message === "rate_limit" || e.message === "network")) {
                throw e;
              }
              // Ignore JSON parse errors for incomplete chunks
            }
          }
        }
      } catch (readError: any) {
        // If we got some content but stream was interrupted, use what we have
        if (hasReceivedContent && fullContent.length > 50) {
          console.log("[AIChatbot] Stream interrupted but have content, using partial response");
          streamCompleted = true;
        } else {
          throw readError;
        }
      }

      // Finalize the message
      setMessages((prev) =>
        prev.map((m) => 
          m.id === assistantMessageId 
            ? { ...m, isStreaming: false, content: fullContent || text.error } 
            : m
        )
      );

      // Play sound on completion
      if (hasReceivedContent) {
        playSound();
      }

    } catch (error: any) {
      console.error("Chatbot stream error:", error);
      
      let errorMessage = text.error;
      let isNetworkError = false;
      
      if (error.name === "AbortError") {
        // Request was cancelled, just clean up
        setMessages((prev) => prev.filter((m) => m.id !== assistantMessageId));
        return;
      } else if (error.message === "rate_limit") {
        errorMessage = text.errorRateLimit;
      } else if (
        error.message === "network" || 
        error.message === "Failed to fetch" ||
        error.name === "TypeError" ||
        error.message?.includes("network") ||
        error.message?.includes("fetch")
      ) {
        errorMessage = text.errorNetwork;
        isNetworkError = true;
      }

      // For network errors, check if we might have a temporary issue
      if (isNetworkError) {
        console.log("[AIChatbot] Network error detected, may be temporary connectivity issue");
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId 
            ? { ...m, content: errorMessage, isStreaming: false, isError: true } 
            : m
        )
      );
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Minimized state - show small floating badge
  if (isOpen && isMinimized) {
    return (
      <motion.button
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-20 md:bottom-4 right-4 z-50 px-4 py-2 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center gap-2"
      >
        <Bot className="w-4 h-4" />
        <span className="text-sm font-medium">{text.title}</span>
        {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
        {voiceMode && <Mic className="w-3 h-3 animate-pulse" />}
      </motion.button>
    );
  }

  return (
    <>
      {/* Floating button when closed */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={handleOpen}
            className="fixed bottom-[136px] md:bottom-[136px] bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg flex items-center justify-center group hover:shadow-xl transition-shadow"
            aria-label={text.title}
          >
            <MessageCircle className="w-6 h-6" />
            {hasUnread && (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center"
              >
                <span className="text-[10px] text-destructive-foreground font-bold">1</span>
              </motion.div>
            )}
            <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat window */}
      <AnimatePresence>
        {isOpen && !isMinimized && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-20 md:bottom-4 right-2 md:right-4 left-2 md:left-auto z-50 w-auto md:w-[420px] h-[75vh] md:h-[600px] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className={cn(
              "border-b border-border p-4 flex items-center justify-between shrink-0",
              voiceMode 
                ? "bg-gradient-to-r from-green-500/20 via-primary/10 to-green-500/20" 
                : "bg-gradient-to-r from-primary/20 via-primary/10 to-amber-500/10"
            )}>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center shadow-md",
                  voiceMode 
                    ? "bg-gradient-to-br from-green-500 to-green-600" 
                    : "bg-gradient-to-br from-primary to-primary/60"
                )}>
                  {voiceMode ? (
                    <Phone className="w-5 h-5 text-white" />
                  ) : (
                    <Bot className="w-5 h-5 text-primary-foreground" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                    {voiceMode ? text.voiceModeActive : text.title}
                    {voiceMode ? (
                      <Mic className="w-3.5 h-3.5 text-green-500 animate-pulse" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    )}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {voiceMode 
                      ? conversation.isSpeaking 
                        ? text.voiceSpeaking 
                        : text.voiceListening
                      : text.subtitle
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleNewChat}
                  title={text.newChat}
                >
                  <RotateCcw className="w-4 h-4 text-muted-foreground" />
                </Button>
                {!voiceMode && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    title={soundEnabled ? "Mute" : "Unmute"}
                  >
                    {soundEnabled ? (
                      <Volume2 className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hidden md:flex"
                  onClick={handleMinimize}
                  title="Minimize"
                >
                  <Minimize2 className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleClose}
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            </div>

            {/* Voice mode overlay */}
            {voiceMode && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-background to-muted/30">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-32 h-32 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-2xl mb-8"
                >
                  <VoiceVisualizer 
                    isActive={conversation.status === "connected"} 
                    isSpeaking={conversation.isSpeaking} 
                  />
                </motion.div>
                
                <p className="text-lg font-medium text-center mb-2">
                  {conversation.isSpeaking ? text.voiceSpeaking : text.voiceListening}
                </p>
                <p className="text-sm text-muted-foreground text-center mb-8">
                  {language === "ro" 
                    ? "Vorbește natural, sunt aici să te ajut" 
                    : "Speak naturally, I'm here to help"
                  }
                </p>

                {/* Recent transcripts */}
                {messages.length > 1 && (
                  <ScrollArea className="w-full max-h-40 mb-8">
                    <div className="space-y-2 px-4">
                      {messages.slice(-4).map((m) => (
                        <div 
                          key={m.id} 
                          className={cn(
                            "text-sm p-2 rounded-lg",
                            m.role === "user" 
                              ? "bg-primary/10 text-right" 
                              : "bg-muted"
                          )}
                        >
                          {m.content.slice(0, 100)}
                          {m.content.length > 100 && "..."}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}

                <Button
                  variant="destructive"
                  size="lg"
                  onClick={endVoiceMode}
                  className="gap-2"
                >
                  <PhoneOff className="w-5 h-5" />
                  {text.endCall}
                </Button>
              </div>
            )}

            {/* Messages area (hidden in voice mode) */}
            {!voiceMode && (
              <>
                <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                  <div className="space-y-4">
                    {messages.map((message, index) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index === messages.length - 1 ? 0.1 : 0 }}
                        className={cn(
                          "flex gap-3 group",
                          message.role === "user" && "flex-row-reverse"
                        )}
                      >
                        <div 
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                            message.role === "user" 
                              ? "bg-primary text-primary-foreground" 
                              : "bg-gradient-to-br from-primary to-primary/60"
                          )}
                        >
                          {message.role === "user" ? (
                            <User className="w-4 h-4" />
                          ) : (
                            <Bot className="w-4 h-4 text-primary-foreground" />
                          )}
                        </div>
                        <div 
                          className={cn(
                            "max-w-[80%] rounded-2xl px-4 py-3 relative",
                            message.role === "user" 
                              ? "bg-primary text-primary-foreground" 
                              : message.isError 
                                ? "bg-destructive/10 border border-destructive/20" 
                                : "bg-secondary"
                          )}
                        >
                          <MarkdownContent 
                            content={message.content || (message.isStreaming ? "" : "...")} 
                            isStreaming={message.isStreaming && !message.content}
                          />
                          
                          {/* Message actions */}
                          {message.role === "assistant" && message.content && !message.isStreaming && (
                            <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => handleCopyMessage(message.id, message.content)}
                              >
                                {copiedMessageId === message.id ? (
                                  <Check className="w-3 h-3 mr-1" />
                                ) : (
                                  <Copy className="w-3 h-3 mr-1" />
                                )}
                                {copiedMessageId === message.id ? text.copied : "Copy"}
                              </Button>
                              {message.isError && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                  onClick={() => {
                                    // Find the last user message before this error
                                    const userMsgIndex = messages.findIndex(m => m.id === message.id) - 1;
                                    if (userMsgIndex >= 0 && messages[userMsgIndex]?.role === "user") {
                                      handleRetry(messages[userMsgIndex].content);
                                    }
                                  }}
                                >
                                  <RotateCcw className="w-3 h-3 mr-1" />
                                  {text.retry}
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}

                    {/* Typing indicator */}
                    {isLoading && messages[messages.length - 1]?.content === "" && (
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0 shadow-sm">
                          <Bot className="w-4 h-4 text-primary-foreground" />
                        </div>
                        <div className="bg-secondary rounded-2xl">
                          <TypingIndicator />
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Quick actions - only show after greeting */}
                {messages.length <= 1 && !isLoading && (
                  <div className="px-4 pb-2">
                    <div className="grid grid-cols-2 gap-2">
                      {quickActions.map((action) => (
                        <Button
                          key={action.id}
                          variant="outline"
                          size="sm"
                          className="h-9 text-xs justify-start gap-2 hover:bg-primary/5 hover:border-primary/30"
                          onClick={() => handleQuickAction(action)}
                        >
                          {action.icon}
                          <span className="truncate">{action.label}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input area */}
                <div className="p-4 border-t border-border bg-background/50 backdrop-blur-sm">
                  <div className="flex gap-2">
                    <Input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={text.placeholder}
                      className="flex-1 h-11"
                      disabled={isLoading}
                      maxLength={2000}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-11 w-11 shrink-0"
                      onClick={startVoiceMode}
                      disabled={isConnectingVoice}
                      title={text.voiceMode}
                    >
                      {isConnectingVoice ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Mic className="w-4 h-4" />
                      )}
                    </Button>
                    <Button 
                      onClick={() => handleSend()} 
                      disabled={!input.trim() || isLoading} 
                      size="icon"
                      className="h-11 w-11 shrink-0"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-muted-foreground">
                      {input.length}/2000
                    </span>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Sparkles className="w-3 h-3 text-primary" />
                      <span className="text-primary font-medium">{text.poweredBy}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIChatbot;
