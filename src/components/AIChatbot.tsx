import { useState, useRef, useEffect, useCallback, forwardRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Send, Bot, User, Sparkles, Loader2, 
  ExternalLink, Minimize2, Mic, Headphones,
  Layers, ShieldCheck, FileDown, RotateCcw,
  Copy, Check, Phone, PhoneOff, Star
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
import { useOptionalSharedAssistantContext } from "@/hooks/useSharedAssistantContext";
// jsPDF loaded dynamically on export to avoid 132KB from initial bundle

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  isError?: boolean;
}

const STREAM_URL = `${supabaseConfig.url}/functions/v1/ai-chatbot-stream`;
const STORAGE_KEY = "apart_ai_chat_v37";

// --- Voice Wave Visualizer ---
const VoiceWave = () => (
  <div className="flex items-center justify-center gap-1 h-4">
    {[1, 2, 3, 4, 5].map((i) => (
      <motion.div
        key={i}
        animate={{ height: [4, 16, 4] }}
        transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
        className="w-1 bg-primary rounded-full"
      />
    ))}
  </div>
);

// --- Full Voice Visualizer ---
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
        transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.1 }}
      />
    ))}
  </div>
);

// --- Premium Markdown Renderer ---
const MarkdownContent = memo(forwardRef<HTMLDivElement, { content: string; isStreaming?: boolean }>(
  ({ content, isStreaming }, ref) => (
    <div ref={ref} className="prose prose-sm dark:prose-invert max-w-none text-[13px] leading-[1.6] tracking-tight">
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="mb-3 last:mb-0 text-foreground/90">{children}</p>,
          strong: ({ children }) => <strong className="font-bold text-primary bg-primary/5 px-1 rounded">{children}</strong>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline inline-flex items-center gap-0.5">
              {children} <ExternalLink className="w-3 h-3" />
            </a>
          ),
          ul: ({ children }) => <ul className="list-disc ml-4 mb-3 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal ml-4 mb-3 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="ml-2">{children}</li>,
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
        <motion.span 
          animate={{ opacity: [0, 1, 0] }} 
          transition={{ repeat: Infinity, duration: 0.8 }} 
          className="inline-block w-2 h-4 bg-primary/60 ml-1 rounded-sm align-middle" 
        />
      )}
    </div>
  )
));
MarkdownContent.displayName = "MarkdownContent";

const AIChatbot = () => {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [isConnectingVoice, setIsConnectingVoice] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [ratingGiven, setRatingGiven] = useState<number | null>(null);
  const [messageCount, setMessageCount] = useState(0);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved).map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })) : [];
    } catch { return []; }
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const sharedContext = useOptionalSharedAssistantContext();

  // --- Translations ---
  const t = {
    ro: {
      title: "Digital Concierge",
      status: "Disponibil 24/7",
      greeting: "Bună ziua! Sunt Concierge-ul dumneavoastră Digital de la RealTrust & ApArt Hotel. Mă bucur că doriți să ne treceți pragul!\n\n**Ce pot face pentru dumneavoastră:**\n\n• 📅 Verifică **disponibilitatea** apartamentelor\n• 💰 Calculează **prețuri** pentru sejur\n• 📊 Estimează **profit** pentru proprietari\n• 🗓️ **Programează** vizionări sau evaluări\n• 🍽️ **Recomandări** restaurante, cafenele, atracții\n\nCum vă pot fi de ajutor astăzi?",
      placeholder: "Cu ce vă pot ajuta?",
      power: "Gemini AI Ultra",
      quickActions: ["Verifică Disponibilitate", "Calcul Investitor", "Ghid Timișoara", "Programează Vizită"],
      error: "A apărut o eroare. Te rog încearcă din nou.",
      errorNetwork: "Conexiune întreruptă. Verifică internetul.",
      errorRateLimit: "Prea multe cereri. Așteaptă un moment.",
      copied: "Copiat!",
      newChat: "Conversație nouă",
      retry: "Încearcă din nou",
      voiceListening: "Ascult...",
      voiceSpeaking: "Vorbesc...",
      voiceModeActive: "Mod vocal activ",
      endCall: "Închide apelul",
      continueVoice: "Continuă vocal",
    },
    en: {
      title: "Digital Concierge",
      status: "Available 24/7",
      greeting: "Welcome to ApArt Hotel. I am your premium digital concierge.\n\n**What I can do for you:**\n\n• 📅 Check apartment **availability**\n• 💰 Calculate **prices** for stays\n• 📊 Estimate **profit** for owners\n• 🗓️ **Schedule** viewings or evaluations\n• 🍽️ **Recommendations** for restaurants, cafes, attractions\n\nHow may I assist you today?",
      placeholder: "How can I help you today?",
      power: "Gemini AI Ultra",
      quickActions: ["Check Availability", "Investor ROI", "Timișoara Guide", "Schedule Visit"],
      error: "An error occurred. Please try again.",
      errorNetwork: "Connection lost. Check your internet.",
      errorRateLimit: "Too many requests. Please wait.",
      copied: "Copied!",
      newChat: "New chat",
      retry: "Try again",
      voiceListening: "Listening...",
      voiceSpeaking: "Speaking...",
      voiceModeActive: "Voice mode active",
      endCall: "End call",
      continueVoice: "Continue with voice",
    }
  };
  const text = t[language as keyof typeof t] || t.ro;

  // --- Add message helper ---
  const addMessage = useCallback((role: "user" | "assistant", content: string, source: "text" | "voice" = "text") => {
    const newMessage: Message = {
      id: crypto.randomUUID(),
      role,
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
    sharedContext?.addMessage(role, content, source);
  }, [sharedContext]);

  // --- ElevenLabs Voice ---
  const conversation = useConversation({
    onConnect: () => {
      setIsConnectingVoice(false);
      toast.success(language === "ro" ? "Mod vocal activat!" : "Voice mode activated!");
    },
    onDisconnect: () => { setVoiceMode(false); setIsConnectingVoice(false); },
    onMessage: (payload) => {
      if (payload.role === "user") addMessage("user", payload.message, "voice");
      else if (payload.role === "agent") addMessage("assistant", payload.message, "voice");
    },
    onError: () => {
      setVoiceMode(false); setIsConnectingVoice(false);
      toast.error(language === "ro" ? "Eroare la conexiunea vocală" : "Voice connection error");
    },
  });

  const startVoiceMode = async () => {
    setIsConnectingVoice(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const { data, error } = await supabase.functions.invoke("elevenlabs-conversation-token", { body: { language } });
      if (error || !data?.token) throw new Error("Failed to get voice token");
      await conversation.startSession({ conversationToken: data.token, connectionType: "webrtc" });
      setVoiceMode(true);
    } catch (error: any) {
      setIsConnectingVoice(false);
      if (error.name === "NotAllowedError") {
        toast.error(language === "ro" ? "Permite accesul la microfon" : "Allow microphone access");
      } else {
        toast.error(language === "ro" ? "Nu s-a putut activa modul vocal" : "Could not activate voice mode");
      }
    }
  };

  const endVoiceMode = async () => {
    await conversation.endSession();
    setVoiceMode(false);
  };

  // --- PDF Export ---
  const exportPDF = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("ApArt Hotel - Digital Concierge Transcript", 10, 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    let y = 35;
    messages.forEach(m => {
      const prefix = m.role === "user" ? "Client" : "Concierge";
      const lines = doc.splitTextToSize(`${prefix}: ${m.content}`, 180);
      if (y + (lines.length * 5) > 280) { doc.addPage(); y = 20; }
      doc.text(lines, 10, y);
      y += (lines.length * 5) + 8;
    });
    doc.save("ApArt_Concierge_Transcript.pdf");
  };

  // --- Streaming Send with auto-retry for network errors ---
  const handleSend = async (overrideMessage?: string, retryCount = 0) => {
    const content = overrideMessage || input.trim();
    if (!content || isLoading) return;

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    const assistantId = retryCount === 0 ? crypto.randomUUID() : undefined;
    if (retryCount === 0) {
      setMessages(prev => [
        ...prev,
        { id: crypto.randomUUID(), role: "user", content, timestamp: new Date() },
        { id: assistantId!, role: "assistant", content: "", isStreaming: true, timestamp: new Date() }
      ]);
      setInput("");
    }
    const targetId = assistantId || messages.filter(m => m.role === "assistant").pop()?.id || "";
    setIsLoading(true);

    try {
      const apiKey = getSupabasePublishableKey();
      if (!apiKey || apiKey === "invalid-publishable-key") throw new Error("missing_env");

      const response = await fetch(STREAM_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "apikey": apiKey,
          "Accept": "text/event-stream",
        },
        body: JSON.stringify({
          message: content,
          language,
          conversationHistory: messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        if (response.status === 429) throw new Error("rate_limit");
        if (response.status === 402) throw new Error("payment_required");
        throw new Error("network");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      let buffer = "";

      if (reader) {
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
                if (parsed.error === "rate_limit" || parsed.error === "ai_rate_limit") throw new Error("rate_limit");
                throw new Error(parsed.error);
              }
              if (parsed.delta) {
                acc += parsed.delta;
                const id = retryCount === 0 ? assistantId! : targetId;
                setMessages(prev => prev.map(m => m.id === id ? { ...m, content: acc } : m));
              }
            } catch (e) {
              if (e instanceof Error && (e.message === "rate_limit" || e.message === "network")) throw e;
            }
          }
        }
      }
      const id = retryCount === 0 ? assistantId! : targetId;
      setMessages(prev => prev.map(m => m.id === id ? { ...m, isStreaming: false, content: acc || text.error } : m));
      // Show rating prompt after 3+ user messages
      setMessageCount(prev => {
        const next = prev + 1;
        if (next >= 3 && !ratingGiven) setShowRating(true);
        return next;
      });
    } catch (e: any) {
      if (e.name === "AbortError") {
        if (retryCount === 0 && assistantId) setMessages(prev => prev.filter(m => m.id !== assistantId));
        return;
      }

      // Auto-retry once for network errors on mobile
      const isNetworkError = e.message === "network" || e.message === "Failed to fetch" || e.name === "TypeError";
      if (isNetworkError && retryCount < 1) {
        console.log("[AIChatbot] Network error, auto-retrying in 1.5s...");
        await new Promise(r => setTimeout(r, 1500));
        return handleSend(content, retryCount + 1);
      }

      let errorMessage = text.error;
      if (e.message === "rate_limit") errorMessage = text.errorRateLimit;
      else if (isNetworkError) errorMessage = text.errorNetwork;

      const id = retryCount === 0 ? assistantId! : targetId;
      setMessages(prev => prev.map(m => m.id === id ? { ...m, content: errorMessage, isStreaming: false, isError: true } : m));
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  // --- Copy message ---
  const handleCopyMessage = async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      toast.success(text.copied);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch {}
  };

  // --- Effects ---
  // Init greeting
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{ id: "greeting", role: "assistant", content: text.greeting, timestamp: new Date() }]);
    }
  }, []);

  // Persist messages
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30))); } catch {}
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      viewport?.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  // Focus input
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current && !voiceMode) inputRef.current.focus();
  }, [isOpen, isMinimized, voiceMode]);

  // Unread notification
  useEffect(() => {
    const timer = setTimeout(() => { if (!isOpen && messages.length <= 1) setHasUnread(true); }, 15000);
    return () => clearTimeout(timer);
  }, [isOpen]);

  // Open from external event
  useEffect(() => {
    const handler = () => { setIsOpen(true); setIsMinimized(false); setHasUnread(false); };
    window.addEventListener('open-ai-chatbot', handler);
    return () => window.removeEventListener('open-ai-chatbot', handler);
  }, []);

  // Transfer callback
  useEffect(() => {
    sharedContext?.onTransferToText(() => {
      setIsOpen(true); setIsMinimized(false); setHasUnread(false);
      if (voiceMode) { conversation.endSession(); setVoiceMode(false); }
    });
  }, [sharedContext, voiceMode, conversation]);

  // Sync voice messages from shared context
  useEffect(() => {
    if (sharedContext?.messages) {
      const voiceMessages = sharedContext.messages.filter(m => m.source === "voice");
      voiceMessages.forEach(vm => {
        const exists = messages.some(m => m.content === vm.content && Math.abs(m.timestamp.getTime() - vm.timestamp.getTime()) < 1000);
        if (!exists) {
          setMessages(prev => [...prev, { id: vm.id, role: vm.role, content: vm.content, timestamp: vm.timestamp }]);
        }
      });
    }
  }, [sharedContext?.messages]);

  // Cleanup
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      if (conversation.status === "connected") conversation.endSession();
    };
  }, []);

  const handleTransferToVoice = async () => {
    setIsOpen(false);
    toast.info(language === "ro" ? "Se activează modul vocal..." : "Activating voice mode...");
    
    // CRITICAL: Request microphone DIRECTLY in click handler to preserve user gesture context
    // Mobile browsers block getUserMedia if not called directly from a user interaction
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } 
      });
      // Pass the pre-acquired stream via custom event (same pattern as FloatingActionMenu)
      window.dispatchEvent(new CustomEvent('elevenlabs-toggle-voice', { detail: { stream } }));
    } catch (error: any) {
      console.error("[AIChatbot] Microphone access error:", error);
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        toast.error(language === "ro" ? "Vă rugăm să permiteți accesul la microfon din setările browser-ului." : "Please allow microphone access in your browser settings.");
      } else if (error.name === "NotFoundError") {
        toast.error(language === "ro" ? "Nu s-a detectat niciun microfon." : "No microphone detected.");
      } else {
        toast.error(language === "ro" ? "Eroare la accesarea microfonului." : "Error accessing microphone.");
      }
    }
  };

  const handleNewChat = () => {
    setMessages([{ id: "greeting-" + Date.now(), role: "assistant", content: text.greeting, timestamp: new Date() }]);
    if (voiceMode) endVoiceMode();
    setShowRating(false);
    setRatingGiven(null);
    setMessageCount(0);
  };

  const handleRating = async (rating: number) => {
    setRatingGiven(rating);
    setShowRating(false);
    try {
      await supabase.from("chat_ratings").insert({
        rating,
        session_id: crypto.randomUUID(),
      });
    } catch {}
    if (rating >= 4) {
      const thankMsg = language === "ro"
        ? "🙏 Mulțumim pentru evaluare! Dacă doriți, ne-ar face plăcere să ne lăsați un [review pe Google](https://g.page/realtrust-timisoara/review)."
        : "🙏 Thank you for your rating! If you would like, we would love a [Google review](https://g.page/realtrust-timisoara/review).";
      addMessage("assistant", thankMsg);
    } else {
      const supportMsg = language === "ro"
        ? "Ne pare rău că experiența nu a fost pe măsura așteptărilor. Vă putem conecta direct cu managerul nostru pentru clarificări: [WhatsApp Manager](https://wa.me/40723154520)"
        : "We are sorry the experience did not meet your expectations. We can connect you directly with our manager: [WhatsApp Manager](https://wa.me/40723154520)";
      addMessage("assistant", supportMsg);
    }
  };

  // ─── RENDER ───────────────────────────────────────────────

  return (
    <>
      {/* Premium Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            whileHover={{ scale: 1.05, y: -5 }}
            onClick={() => { setIsOpen(true); setIsMinimized(false); setHasUnread(false); }}
            className="fixed bottom-[136px] md:bottom-[136px] right-4 z-40 w-16 h-16 rounded-full bg-primary text-primary-foreground shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center justify-center border-4 border-primary/20 backdrop-blur-md"
            aria-label={text.title}
          >
            <Bot className="w-8 h-8 relative z-10" />
            {/* Pulsar ring 1 */}
            <motion.div
              animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
              className="absolute inset-0 border-2 border-primary rounded-full"
            />
            {/* Pulsar ring 2 (delayed) */}
            <motion.div
              animate={{ scale: [1, 1.8], opacity: [0.4, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeOut", delay: 0.6 }}
              className="absolute inset-0 border-2 border-primary rounded-full"
            />
            {/* Inner glow pulse */}
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.25, 0.05, 0.25] }}
              transition={{ repeat: Infinity, duration: 2.5 }}
              className="absolute inset-0 bg-primary rounded-full"
            />
            {hasUnread && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center">
                <span className="text-[10px] text-destructive-foreground font-bold">1</span>
              </motion.div>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "fixed z-50 bg-card/95 backdrop-blur-xl border border-border/50 shadow-[0_30px_100px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden transition-all duration-500",
              isMinimized
                ? "bottom-8 right-8 w-72 h-16 rounded-full"
                : "bottom-4 right-2 md:right-4 left-2 md:left-auto w-auto md:w-[450px] h-[80vh] md:h-[700px] rounded-[2rem]"
            )}
          >
            {/* Stream Progress Bar */}
            {isLoading && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 15, ease: "linear" }}
                className="h-0.5 bg-primary absolute top-0 left-0 z-10"
              />
            )}

            {/* ─── Premium Header ─── */}
            <div className="p-5 border-b border-border/30 flex items-center justify-between shrink-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center border shadow-lg",
                    voiceMode
                      ? "bg-accent/20 border-accent/30"
                      : "bg-primary/20 border-primary/30"
                  )}>
                    {voiceMode ? <Phone className="w-6 h-6 text-accent" /> : <Bot className="w-7 h-7 text-primary" />}
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-accent border-[3px] border-card rounded-full" />
                </div>
                {!isMinimized && (
                  <div>
                    <h3 className="font-bold text-base tracking-tight text-foreground">
                      {voiceMode ? text.voiceModeActive : text.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      {voiceMode ? <VoiceWave /> : (
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold opacity-60">
                          {text.status}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1">
                {!isMinimized && (
                  <>
                    <Button variant="ghost" size="icon" className="rounded-xl hover:bg-muted/50 h-9 w-9" onClick={exportPDF} title="Export PDF">
                      <FileDown className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-xl hover:bg-muted/50 h-9 w-9" onClick={handleNewChat} title={text.newChat}>
                      <RotateCcw className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      className={cn("rounded-xl h-9 w-9 transition-colors", voiceMode && "bg-primary/20 text-primary")}
                      onClick={async () => voiceMode ? endVoiceMode() : startVoiceMode()}
                    >
                      {isConnectingVoice ? <Loader2 className="w-4 h-4 animate-spin" /> : voiceMode ? <Headphones className="w-5 h-5 text-primary" /> : <Mic className="w-5 h-5 text-muted-foreground" />}
                    </Button>
                  </>
                )}
                <Button variant="ghost" size="icon" className="rounded-xl hover:bg-muted/50 h-9 w-9 hidden md:flex" onClick={() => setIsMinimized(!isMinimized)}>
                  <Minimize2 className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" className="rounded-xl hover:bg-muted/50 h-9 w-9" onClick={() => { setIsOpen(false); setIsMinimized(false); abortControllerRef.current?.abort(); if (voiceMode) endVoiceMode(); }}>
                  <X className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            </div>

            {/* ─── Voice Mode Overlay ─── */}
            {!isMinimized && voiceMode && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-background to-muted/30">
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-32 h-32 rounded-full bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center shadow-2xl mb-8">
                  <VoiceVisualizer isActive={conversation.status === "connected"} isSpeaking={conversation.isSpeaking} />
                </motion.div>
                <p className="text-lg font-medium text-center mb-2">
                  {conversation.isSpeaking ? text.voiceSpeaking : text.voiceListening}
                </p>
                <p className="text-sm text-muted-foreground text-center mb-8">
                  {language === "ro" ? "Vorbește natural, sunt aici să te ajut" : "Speak naturally, I'm here to help"}
                </p>
                {messages.length > 1 && (
                  <ScrollArea className="w-full max-h-40 mb-8">
                    <div className="space-y-2 px-4">
                      {messages.slice(-4).map((m) => (
                        <div key={m.id} className={cn("text-sm p-2 rounded-lg", m.role === "user" ? "bg-primary/10 text-right" : "bg-muted")}>
                          {m.content.slice(0, 100)}{m.content.length > 100 && "..."}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
                <Button variant="destructive" size="lg" onClick={endVoiceMode} className="gap-2">
                  <PhoneOff className="w-5 h-5" /> {text.endCall}
                </Button>
              </div>
            )}

            {/* ─── Chat Body ─── */}
            {!isMinimized && !voiceMode && (
              <>
                <ScrollArea className="flex-1 p-5" ref={scrollRef}>
                  <div className="space-y-6">
                    {/* Empty state */}
                    {messages.length === 0 && (
                      <div className="text-center py-12 space-y-6">
                        <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto border border-primary/20">
                          <Layers className="w-10 h-10 text-primary/40" />
                        </div>
                        <p className="text-sm text-muted-foreground px-10 leading-relaxed font-medium">{text.greeting}</p>
                      </div>
                    )}

                    {/* Messages */}
                    {messages.map((m) => (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn("flex gap-4 group", m.role === "user" ? "flex-row-reverse" : "flex-row")}
                      >
                        <div className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-lg",
                          m.role === "user" ? "bg-muted text-foreground" : "bg-primary text-primary-foreground"
                        )}>
                          {m.role === "user" ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                        </div>
                        <div className={cn(
                          "max-w-[80%] p-4 px-5 rounded-[1.5rem] shadow-sm relative",
                          m.role === "user"
                            ? "bg-primary text-primary-foreground rounded-tr-none"
                            : m.isError
                              ? "bg-destructive/10 border border-destructive/20 rounded-tl-none"
                              : "bg-muted/50 rounded-tl-none border border-border/30"
                        )}>
                          <MarkdownContent content={m.content || (m.isStreaming ? "" : "...")} isStreaming={m.isStreaming && !m.content} />
                          
                          {/* Message actions */}
                          {m.role === "assistant" && m.content && !m.isStreaming && (
                            <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => handleCopyMessage(m.id, m.content)}>
                                {copiedMessageId === m.id ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                                {copiedMessageId === m.id ? text.copied : "Copy"}
                              </Button>
                              {m.isError && (
                                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => {
                                  const idx = messages.findIndex(msg => msg.id === m.id) - 1;
                                  if (idx >= 0 && messages[idx]?.role === "user") {
                                    setMessages(prev => prev.filter(msg => !msg.isError));
                                    handleSend(messages[idx].content);
                                  }
                                }}>
                                  <RotateCcw className="w-3 h-3 mr-1" /> {text.retry}
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}

                    {/* Typing indicator */}
                    {isLoading && messages[messages.length - 1]?.content === "" && (
                      <div className="flex gap-4">
                        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-lg">
                          <Bot className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <div className="bg-muted/50 rounded-[1.5rem] rounded-tl-none border border-border/30 px-5 py-3">
                          <div className="flex gap-1.5 items-center">
                            {[0, 1, 2].map((i) => (
                              <motion.div key={i} className="w-2 h-2 rounded-full bg-primary/60" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quick Actions */}
                  {messages.length <= 1 && !isLoading && (
                    <div className="flex flex-wrap gap-2 mt-10 justify-center px-4">
                      {text.quickActions.map((action, i) => (
                        <button
                          key={i}
                          onClick={() => handleSend(action)}
                          className="px-4 py-2.5 rounded-xl bg-muted/50 border border-border/50 text-[11px] font-bold uppercase tracking-wider hover:bg-primary/10 hover:border-primary/40 transition-all text-foreground"
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                {/* ─── Rating Widget ─── */}
                {showRating && !ratingGiven && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mx-5 mb-3 p-4 rounded-2xl bg-primary/5 border border-primary/20 text-center"
                  >
                    <p className="text-sm font-medium mb-2">
                      {language === "ro" ? "Cum ați evalua această conversație?" : "How would you rate this conversation?"}
                    </p>
                    <div className="flex justify-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => handleRating(star)}
                          className="p-1 hover:scale-125 transition-transform"
                        >
                          <Star className="w-7 h-7 text-yellow-500 hover:fill-yellow-500" />
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* ─── Premium Input ─── */}
                <div className="p-5 border-t border-border/30 bg-muted/10 backdrop-blur-sm">
                  {/* Voice transfer banner */}
                  {messages.length > 2 && sharedContext && (
                    <button
                      onClick={handleTransferToVoice}
                      className="w-full mb-3 px-3 py-2 bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center gap-2 text-sm text-primary transition-colors"
                    >
                      <Mic className="w-4 h-4" />
                      <span className="font-medium">{text.continueVoice}</span>
                    </button>
                  )}

                  <div className="flex gap-3 items-center">
                    <div className="relative flex-1">
                      <Input
                        ref={inputRef}
                        placeholder={text.placeholder}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                        className="h-14 rounded-2xl bg-muted/30 border-border/50 focus-visible:ring-primary/50 text-base pr-12"
                        disabled={isLoading}
                        maxLength={2000}
                      />
                      <Sparkles className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/30" />
                    </div>
                    <Button
                      size="icon"
                      className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground shadow-xl hover:scale-105 transition-transform"
                      onClick={() => handleSend()}
                      disabled={!input.trim() || isLoading}
                    >
                      {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between mt-3 px-2">
                    <div className="flex items-center gap-2 opacity-40">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Secured</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground">{input.length}/2000</span>
                      <span className="text-muted-foreground/30 mx-1">·</span>
                      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                      <span className="text-[10px] font-bold text-primary">{text.power}</span>
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
