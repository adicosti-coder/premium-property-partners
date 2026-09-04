import { useState, useRef, useEffect, useCallback, forwardRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Send, Bot, User, Sparkles, Loader2, 
  ExternalLink, Minimize2, Mic, Headphones,
  Layers, ShieldCheck, FileDown, RotateCcw,
  Copy, Check, Phone, PhoneOff, Star, Camera,
  CheckCircle2, MapPin, TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/i18n/LanguageContext";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
  imagePreview?: string;
}

interface PropertyReport {
  scor: number;
  max_scor: number;
  zona: string;
  roi_estimat: string;
  tarif_noapte: number;
  note_consultant: string;
  recomandari: string[];
  categorie: string;
}

interface QualificationData {
  name: string;
  phone: string;
  zone: string;
}

interface ConciergeListingCard {
  name: string;
  location: string;
  roi?: string;
  revenue?: string;
  badge: string;
  url: string;
  context?: string;
}

const STREAM_URL = `${supabaseConfig.url}/functions/v1/ai-chatbot-stream`;
const STORAGE_KEY = "apart_ai_chat_v37";

const REALTRUST_PROPERTY_URL = /https:\/\/(?:www\.)?realtrust\.ro\/proprietate\/[^\s)"'>]+/i;
const BLOCKED_EXTERNAL_MARKETPLACES = /\b(olx|publi24|storia|imobiliare\.ro|lajumate|facebook\.com\/marketplace)\b/i;

const cleanCardValue = (value?: string) => value?.replace(/[*_`]/g, "").replace(/^[:\s-]+/, "").trim();
const cleanCardUrl = (value?: string) => cleanCardValue(value)?.replace(/[.,;:!?]+$/, "");

const parseCardAttributes = (source: string): Partial<ConciergeListingCard> => {
  const raw: Record<string, string> = {};
  source.replace(/(name|location|roi|revenue|badge|url|context)=(?:"([^"]*)"|'([^']*)')/gi, (_, key, value, altValue) => {
    const resolvedValue = value || altValue || "";
    raw[key.toLowerCase()] = cleanCardValue(resolvedValue) || "";
    if (key.toLowerCase() === "url") raw.url = cleanCardUrl(resolvedValue) || "";
    return "";
  });
  return {
    name: raw.name,
    location: raw.location,
    roi: raw.roi,
    revenue: raw.revenue,
    badge: raw.badge,
    url: raw.url,
    context: raw.context,
  };
};

const parseConciergeListingCards = (content: string): { text: string; cards: ConciergeListingCard[] } => {
  const cards: ConciergeListingCard[] = [];
  const withoutStructuredCards = content.replace(/<RT_CARD\s+([^>]+)>/gi, (_, attrSource) => {
    const attrs = parseCardAttributes(attrSource);
    if (attrs.url && REALTRUST_PROPERTY_URL.test(attrs.url)) {
      cards.push({
        name: attrs.name || "Proprietate RealTrust",
        location: attrs.location || "Timișoara",
        roi: attrs.roi,
        revenue: attrs.revenue,
        badge: attrs.badge || "Verificat RealTrust",
        url: attrs.url,
        context: attrs.context,
      });
    }
    return "";
  });

  const keptLines = withoutStructuredCards.split("\n").filter((line) => {
    const url = cleanCardUrl(line.match(REALTRUST_PROPERTY_URL)?.[0]);
    if (!url || !/(link realtrust|realtrust|roi|venit|randament)/i.test(line)) return true;

    const readableLine = line
      .replace(/^\s*[-*•]\s*/, "")
      .replace(/\[[^\]]+\]\([^)]*\)/g, "")
      .replace(REALTRUST_PROPERTY_URL, "")
      .trim();
    const [identity = "", ...details] = readableLine.split("|").map((part) => part.trim()).filter(Boolean);
    const [rawName, rawLocation] = identity.split(/\s+[–—-]\s+/);
    const roi = cleanCardValue(details.find((part) => /roi|randament/i.test(part))?.replace(/^(roi|roi estimat|randament estimat)\s*:?\s*/i, ""));
    const revenue = cleanCardValue(details.find((part) => /venit/i.test(part))?.replace(/^(venit|venit estimat)\s*:?\s*/i, ""));
    const badge = cleanCardValue(details.find((part) => /badge|verificat|premium|portofoliu/i.test(part))?.replace(/^badge\s*:?\s*/i, "")) || "Verificat RealTrust";

    cards.push({
      name: cleanCardValue(rawName) || "Proprietate RealTrust",
      location: cleanCardValue(rawLocation) || "Timișoara",
      roi,
      revenue,
      badge,
      url,
      context: cleanCardValue(details.find((part) => /potrivit|strategie|context/i.test(part))?.replace(/^(potrivit pentru|strategie|context)\s*:?\s*/i, "")),
    });

    return false;
  });

  return { text: keptLines.join("\n").replace(/\n{3,}/g, "\n\n").trim(), cards };
};

const ConciergeListingCards = ({ cards }: { cards: ConciergeListingCard[] }) => {
  if (!cards.length) return null;

  return (
    <div className="mt-3 grid gap-2.5">
      {cards.map((card) => {
        const advisoryHref = `https://wa.me/40799069256?text=${encodeURIComponent(`Bună ziua, doresc consultanță RealTrust pentru ${card.name}: ${card.url}`)}`;
        return (
        <article key={`${card.name}-${card.url}`} className="rounded-lg border border-border/50 bg-card p-3 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold leading-snug text-foreground">{card.name}</h3>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="truncate">{card.location}</span>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              <ShieldCheck className="h-3 w-3" />
              {card.badge}
            </span>
          </div>

          {card.context && (
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{card.context}</p>
          )}

          {(card.roi || card.revenue) && (
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md bg-muted/60 px-2 py-1.5">
                <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">ROI</span>
                <strong className="inline-flex items-center gap-1 text-foreground"><TrendingUp className="h-3 w-3 text-primary" />{card.roi || "La cerere"}</strong>
              </div>
              <div className="rounded-md bg-muted/60 px-2 py-1.5">
                <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">Venit</span>
                <strong className="text-foreground">{card.revenue || "Estimare privată"}</strong>
              </div>
            </div>
          )}

          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button asChild size="sm" variant="outline" className="h-9 px-2 text-xs">
              <a href={card.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-1 h-3.5 w-3.5" />Link</a>
            </Button>
            <Button asChild size="sm" className="h-9 px-2 text-xs">
              <a href={advisoryHref} target="_blank" rel="noopener noreferrer"><Phone className="mr-1 h-3.5 w-3.5" />Consultanță</a>
            </Button>
          </div>
        </article>
        );
      })}
    </div>
  );
};

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
  ({ content, isStreaming }, ref) => {
    const { text, cards } = parseConciergeListingCards(content);

    return (
      <div ref={ref} className="prose prose-sm dark:prose-invert max-w-none text-[13px] leading-[1.6] tracking-tight">
        {text && (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="mb-3 last:mb-0 text-foreground/90">{children}</p>,
              strong: ({ children }) => <strong className="font-bold text-primary bg-primary/5 px-1 rounded">{children}</strong>,
              a: ({ href, children }) => {
                if (href && BLOCKED_EXTERNAL_MARKETPLACES.test(href)) return <span className="font-medium text-foreground">{children}</span>;
                return (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline inline-flex items-center gap-0.5">
                    {children} <ExternalLink className="w-3 h-3" />
                  </a>
                );
              },
              ul: ({ children }) => <ul className="list-disc ml-4 mb-3 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal ml-4 mb-3 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="ml-2">{children}</li>,
              code: ({ children }) => (
                <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
              ),
              h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
              h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
              h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
              table: ({ children }) => <div className="my-3 w-full overflow-x-auto rounded-lg border border-border/40"><table className="min-w-[520px] w-full border-collapse text-xs">{children}</table></div>,
              thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
              th: ({ children }) => <th className="px-2 py-1.5 text-left font-semibold border border-border/50">{children}</th>,
              td: ({ children }) => <td className="px-2 py-1.5 border border-border/50">{children}</td>,
            }}
          >
            {text}
          </ReactMarkdown>
        )}
        <ConciergeListingCards cards={cards} />
        {isStreaming && (
          <motion.span 
            animate={{ opacity: [0, 1, 0] }} 
            transition={{ repeat: Infinity, duration: 0.8 }} 
            className="inline-block w-2 h-4 bg-primary/60 ml-1 rounded-sm align-middle" 
          />
        )}
      </div>
    );
  }
));
MarkdownContent.displayName = "MarkdownContent";

// Context-aware quick actions based on current page
const getContextualQuickActions = (lang: "ro" | "en"): string[] => {
  const path = typeof window !== "undefined" ? window.location.pathname : "/";
  
  if (path.startsWith("/pentru-proprietari") || path.startsWith("/investitii")) {
    return lang === "ro"
      ? ["💰 Calculează randamentul proprietății mele", "📊 Comision 15-25% — ce include fiecare pachet?", "📸 Vreau evaluare gratuită a apartamentului", "📖 Citește Ghidul 2026"]
      : ["💰 Calculate my property's yield", "📊 15-25% commission — what's included?", "📸 I want a free apartment evaluation", "📖 Read the 2026 Guide"];
  }
  if (path.startsWith("/proprietate/")) {
    return lang === "ro"
      ? ["📅 Verifică disponibilitatea live", "🏷️ Aplică codul DIRECT5 (-5%)", "🛎️ Ce facilități premium sunt incluse?", "📞 Rezervă direct cu discount"]
      : ["📅 Check live availability", "🏷️ Apply DIRECT5 code (-5%)", "🛎️ What premium amenities are included?", "📞 Book directly with discount"];
  }
  if (path.startsWith("/oaspeti") || path.startsWith("/cazare")) {
    return lang === "ro"
      ? ["🏠 Ce apartamente sunt libere acum?", "👨‍👩‍👧 Recomandă-mi cazare pentru familie", "🍽️ Top restaurante lângă apartament", "✈️ Transfer aeroport & check-in rapid"]
      : ["🏠 Which apartments are free now?", "👨‍👩‍👧 Recommend family-friendly stays", "🍽️ Top restaurants near apartment", "✈️ Airport transfer & express check-in"];
  }
  if (path.startsWith("/zona/")) {
    return lang === "ro"
      ? ["📊 Randamentul mediu în această zonă", "🏠 Apartamente disponibile aici", "📈 Comparație ROI cu alte zone", "🗓️ Programează o vizită în zonă"]
      : ["📊 Average yield in this area", "🏠 Available apartments here", "📈 ROI comparison with other areas", "🗓️ Schedule a visit in this area"];
  }
  if (path.startsWith("/blog")) {
    return lang === "ro"
      ? ["💡 Cum îmi maximizez venitul din regim hotelier?", "📊 Airbnb vs Booking — ce platformă e mai bună?", "🏠 Vreau să-mi listez proprietatea", "📥 Ghidul complet al investitorului"]
      : ["💡 How to maximize short-term rental income?", "📊 Airbnb vs Booking — which is better?", "🏠 I want to list my property", "📥 Complete investor guide"];
  }
  if (path.startsWith("/imobiliare")) {
    return lang === "ro"
      ? ["🏗️ Portofoliu investițional verificat", "💰 Simulare randament investiție", "🔑 Caut apartament cu potențial STR", "📞 Consultanță RealTrust"]
      : ["🏗️ Verified investment portfolio", "💰 Investment yield simulation", "🔑 Looking for STR-potential apartment", "📞 RealTrust advisory"];
  }
  // Default — Hub / Homepage
  return lang === "ro"
    ? ["🏠 Ce apartamente sunt libere acum?", "💰 Calculează-mi randamentul investiției", "📸 Evaluare gratuită a proprietății mele", "🗺️ Ghid local — restaurante și atracții"]
    : ["🏠 Which apartments are free now?", "💰 Calculate my investment yield", "📸 Free evaluation of my property", "🗺️ Local guide — restaurants & attractions"];
};

// --- Report Parser ---
const parsePropertyReport = (text: string): PropertyReport | null => {
  const match = text.match(/<RAPORT_JSON>([\s\S]*?)<\/RAPORT_JSON>/);
  if (!match) return null;
  try { return JSON.parse(match[1].trim()); } catch { return null; }
};
const cleanReportFromText = (text: string) => text.replace(/<RAPORT_JSON>[\s\S]*?<\/RAPORT_JSON>/g, "").trim();

const QUALIFICATION_ZONES = ["ISHO", "Paltim", "Centru", "Iulius Town", "City of Mara", "Nord-One", "Monarch", "Ateneo", "Vivalia", "Altă zonă"];

const AIChatbot = () => {
  const { language } = useLanguage();
  const currentPath = typeof window !== "undefined" ? window.location.pathname : "/";
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
  
  // --- HostScan Features ---
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [propertyReport, setPropertyReport] = useState<PropertyReport | null>(null);
  const [showQualificationWizard, setShowQualificationWizard] = useState(false);
  const [qualificationData, setQualificationData] = useState<QualificationData | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = localStorage.getItem("apart_qualification_data");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [wizardForm, setWizardForm] = useState({ name: "", phone: "", zone: "ISHO" });
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      status: "RealTrust Advisory 24/7",
      greeting: "Bună ziua! Sunt **Digital Concierge RealTrust & ApArt Hotel**. 🏛️✨\n\nVă pot ajuta cu **disponibilitate live**, **portofoliu investițional verificat**, **simulare ROI**, **HostScan din fotografii** și **programare consultanță**.\n\nPentru oportunități imobiliare recomand exclusiv proprietăți RealTrust administrate, verificate sau curate editorial — fără marketplace-uri și fără anunțuri externe neverificate.",
      placeholder: "Întrebați despre cazare, ROI, investiții sau consultanță...",
      power: "Curated Portfolio · Live Data",
      quickActions: getContextualQuickActions("ro"),
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
      status: "RealTrust Advisory 24/7",
      greeting: "Welcome to **RealTrust & ApArt Hotel Timișoara**. 🏛️✨ I can help with **live availability**, **verified investment listings**, **ROI simulations**, **photo-based HostScan**, and **private advisory scheduling**.\n\nFor real estate opportunities, I recommend only managed, verified, or editorially curated RealTrust properties — no marketplaces and no unverified external ads.",
      placeholder: "Ask about stays, ROI, investments or advisory...",
      power: "Curated Portfolio · Live Data",
      quickActions: getContextualQuickActions("en"),
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
  const voiceRetryCount = useRef(0);
  const conversation = useConversation({
    onConnect: () => {
      console.log("[AIChatbot] Voice connected successfully");
      voiceRetryCount.current = 0;
      setIsConnectingVoice(false);
      toast.success(language === "ro" ? "Mod vocal activat!" : "Voice mode activated!");
    },
    onDisconnect: () => {
      console.log("[AIChatbot] Voice disconnected");
      setVoiceMode(false);
      setIsConnectingVoice(false);
    },
    onMessage: (payload: any) => {
      // Support both old format (role/message) and new format (type-based events)
      if (payload.type === "user_transcript" && payload.user_transcription_event?.user_transcript) {
        addMessage("user", payload.user_transcription_event.user_transcript, "voice");
      } else if (payload.type === "agent_response" && payload.agent_response_event?.agent_response) {
        addMessage("assistant", payload.agent_response_event.agent_response, "voice");
      } else if (payload.role === "user" && payload.message) {
        addMessage("user", payload.message, "voice");
      } else if (payload.role === "agent" && payload.message) {
        addMessage("assistant", payload.message, "voice");
      }
    },
    onError: (error: any) => {
      console.error("[AIChatbot] Voice error:", error);
      setVoiceMode(false);
      setIsConnectingVoice(false);
      toast.error(language === "ro" ? "Eroare la conexiunea vocală. Încercați din nou." : "Voice connection error. Try again.");
    },
  });

  const startVoiceMode = async () => {
    setIsConnectingVoice(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const { data, error } = await supabase.functions.invoke("elevenlabs-conversation-token", { body: { language } });

      if (error || !data?.token) {
        console.error("[AIChatbot] Token error:", error, "data:", data);
        stream.getTracks().forEach(t => t.stop());
        throw new Error("Failed to get voice token");
      }

      console.log("[AIChatbot] Token received, starting WebRTC for agent:", data.agentId);
      await conversation.startSession({ conversationToken: data.token, connectionType: "webrtc" });
      stream.getTracks().forEach(t => t.stop());
      setVoiceMode(true);
    } catch (error: any) {
      console.error("[AIChatbot] startVoiceMode error:", error?.message || error);
      setIsConnectingVoice(false);
      if (error.name === "NotAllowedError") {
        toast.error(language === "ro" ? "Permite accesul la microfon" : "Allow microphone access");
      } else {
        toast.error(language === "ro" ? "Nu s-a putut activa modul vocal. Încercați din nou." : "Could not activate voice mode. Try again.");
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

  // --- Image Upload Handler ---
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(language === "ro" ? "Imaginea este prea mare (max 5MB)" : "Image too large (max 5MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAttachedImage(reader.result as string);
    reader.readAsDataURL(file);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // --- Qualification Wizard Submit ---
  const handleQualificationSubmit = () => {
    if (!wizardForm.name.trim() || !wizardForm.phone.trim()) {
      toast.error(language === "ro" ? "Completează numele și telefonul" : "Please fill in name and phone");
      return;
    }
    const data: QualificationData = { name: wizardForm.name.trim(), phone: wizardForm.phone.trim(), zone: wizardForm.zone };
    setQualificationData(data);
    localStorage.setItem("apart_qualification_data", JSON.stringify(data));
    setShowQualificationWizard(false);
    // Start conversation with context
    handleSend(language === "ro" 
      ? `Salut! Sunt ${data.name}. Am un apartament în zona ${data.zone} și vreau o analiză de potențial.`
      : `Hi! I'm ${data.name}. I have an apartment in ${data.zone} and I'd like a potential analysis.`
    );
  };

  // --- Streaming Send with auto-retry for network errors ---
  const handleSend = async (overrideMessage?: string, retryCount = 0) => {
    const content = overrideMessage || input.trim();
    const hasImage = !!attachedImage;
    if ((!content && !hasImage) || isLoading) return;

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    const currentImage = attachedImage;
    const assistantId = retryCount === 0 ? crypto.randomUUID() : undefined;
    if (retryCount === 0) {
      setMessages(prev => [
        ...prev,
        { id: crypto.randomUUID(), role: "user", content: content || (language === "ro" ? "Am atașat o imagine cu proprietatea." : "I attached a property image."), timestamp: new Date(), imagePreview: currentImage || undefined },
        { id: assistantId!, role: "assistant", content: "", isStreaming: true, timestamp: new Date() }
      ]);
      setInput("");
      setAttachedImage(null);
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
          message: content || "",
          language,
          conversationHistory: messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
          pageContext: currentPath,
          imageBase64: hasImage ? currentImage : undefined,
          qualificationContext: qualificationData || undefined,
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
      
      // --- Parse report from completed response ---
      const report = parsePropertyReport(acc);
      if (report) {
        setPropertyReport(report);
        acc = cleanReportFromText(acc);
      }
      
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
    setPropertyReport(null);
    setAttachedImage(null);
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
        ? "🙏 Mulțumim pentru evaluare! Dacă doriți, ne-ar face plăcere să ne lăsați un [review pe Google](https://share.google/oNmn1ltr7L0OEiHet)."
        : "🙏 Thank you for your rating! If you would like, we would love a [Google review](https://share.google/oNmn1ltr7L0OEiHet).";
      addMessage("assistant", thankMsg);
    } else {
      const supportMsg = language === "ro"
        ? "Ne pare rău că experiența nu a fost pe măsura așteptărilor. Vă putem conecta direct cu managerul nostru pentru clarificări: [WhatsApp Manager](https://wa.me/40799069256)"
        : "We are sorry the experience did not meet your expectations. We can connect you directly with our manager: [WhatsApp Manager](https://wa.me/40799069256)";
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
              "fixed z-50 bg-card/98 backdrop-blur-xl border border-border/50 shadow-[0_30px_100px_rgba(0,0,0,0.38)] flex flex-col overflow-hidden transition-all duration-500",
              isMinimized
                ? "bottom-8 right-8 w-72 h-16 rounded-full"
                : "bottom-[max(0.75rem,env(safe-area-inset-bottom))] right-2 md:right-4 left-2 md:left-auto w-auto md:w-[450px] h-[min(82vh,720px)] md:h-[700px] rounded-[1.75rem]"
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
            <div className="px-4 py-3 md:p-5 border-b border-border/30 flex items-center justify-between shrink-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative">
                  <div className={cn(
                    "w-11 h-11 md:w-12 md:h-12 rounded-2xl flex items-center justify-center border shadow-lg",
                    voiceMode
                      ? "bg-accent/20 border-accent/30"
                      : "bg-primary/20 border-primary/30"
                  )}>
                    {voiceMode ? <Phone className="w-6 h-6 text-accent" /> : <Bot className="w-7 h-7 text-primary" />}
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-accent border-[3px] border-card rounded-full" />
                </div>
                {!isMinimized && (
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm md:text-base tracking-tight text-foreground truncate">
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
                <ScrollArea className="flex-1 px-3 py-4 md:p-5" ref={scrollRef}>
                  <div className="space-y-5">
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
                        className={cn("flex gap-2.5 md:gap-4 group", m.role === "user" ? "flex-row-reverse" : "flex-row")}
                      >
                        <div className={cn(
                          "w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center shrink-0 shadow-lg",
                          m.role === "user" ? "bg-muted text-foreground" : "bg-primary text-primary-foreground"
                        )}>
                          {m.role === "user" ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                        </div>
                        <div className={cn(
                          "max-w-[calc(100%-3rem)] md:max-w-[80%] p-3.5 md:p-4 md:px-5 rounded-[1.35rem] md:rounded-[1.5rem] shadow-sm relative overflow-hidden",
                          m.role === "user"
                            ? "bg-primary text-primary-foreground rounded-tr-none"
                            : m.isError
                              ? "bg-destructive/10 border border-destructive/20 rounded-tl-none"
                              : "bg-muted/50 rounded-tl-none border border-border/30"
                        )}>
                          {/* Image preview */}
                          {m.imagePreview && (
                            <img src={m.imagePreview} alt="Property" className="rounded-xl border border-border/20 max-h-40 mb-2 w-full object-cover" />
                          )}
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

                  {/* ─── Property Report Card ─── */}
                  {propertyReport && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mx-2 mt-6 p-5 rounded-2xl bg-gradient-to-br from-primary/10 via-card to-accent/5 border border-primary/30 shadow-xl space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-primary" />
                          <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-primary">
                            {language === "ro" ? "Raport Proprietate" : "Property Report"}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-3xl font-bold text-foreground">{propertyReport.scor}</span>
                          <span className="text-sm text-muted-foreground">/{propertyReport.max_scor}</span>
                        </div>
                      </div>
                      
                      {/* Score progress bar */}
                      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(propertyReport.scor / propertyReport.max_scor) * 100}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className={cn(
                            "h-full rounded-full",
                            propertyReport.scor >= 100 ? "bg-accent" : propertyReport.scor >= 70 ? "bg-primary" : "bg-destructive"
                          )}
                        />
                      </div>
                      
                      {/* Stats row */}
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="bg-background/50 rounded-xl p-2.5 border border-border/30">
                          <MapPin className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                          <p className="text-xs font-bold text-foreground">{propertyReport.zona}</p>
                          <p className="text-[10px] text-muted-foreground">{language === "ro" ? "Zonă" : "Zone"}</p>
                        </div>
                        <div className="bg-background/50 rounded-xl p-2.5 border border-border/30">
                          <TrendingUp className="w-4 h-4 mx-auto text-accent mb-1" />
                          <p className="text-xs font-bold text-foreground">{propertyReport.roi_estimat}</p>
                          <p className="text-[10px] text-muted-foreground">ROI</p>
                        </div>
                        <div className="bg-background/50 rounded-xl p-2.5 border border-border/30">
                          <span className="text-sm">€</span>
                          <p className="text-xs font-bold text-foreground">{propertyReport.tarif_noapte}€</p>
                          <p className="text-[10px] text-muted-foreground">{language === "ro" ? "Noapte" : "Night"}</p>
                        </div>
                      </div>
                      
                      {/* Consultant note */}
                      <p className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-3">
                        "{propertyReport.note_consultant}"
                      </p>
                      
                      {/* Recommendations */}
                      {propertyReport.recomandari?.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {language === "ro" ? "Recomandări" : "Recommendations"}
                          </p>
                          {propertyReport.recomandari.map((rec, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-foreground/80">
                              <CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0" />
                              {rec}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* CTA */}
                      <Button
                        variant="whatsapp"
                        size="lg"
                        className="w-full gap-2"
                        onClick={() => window.open(`https://wa.me/40799069256?text=${encodeURIComponent(
                          `Scor HostScan: ${propertyReport.scor}/${propertyReport.max_scor} pentru ${propertyReport.zona}. ROI estimat: ${propertyReport.roi_estimat}. Vreau o evaluare detaliată.`
                        )}`, '_blank', 'noopener,noreferrer')}
                      >
                        {language === "ro" ? "CONTACTEAZĂ ECHIPA" : "CONTACT TEAM"}
                      </Button>
                    </motion.div>
                  )}

                  {/* Quick Actions */}
                  {messages.length <= 1 && !isLoading && !showQualificationWizard && (
                    <div className="mt-6 space-y-4">
                      {/* Qualification wizard trigger */}
                      {!qualificationData && (currentPath.includes("/pentru-proprietari") || currentPath.includes("/investitii") || currentPath === "/") && (
                        <motion.button
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          onClick={() => setShowQualificationWizard(true)}
                          className="w-full px-4 py-3 rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/30 text-sm font-semibold text-primary hover:from-primary/20 hover:to-accent/20 transition-all flex items-center justify-center gap-2"
                        >
                          <TrendingUp className="w-4 h-4" />
                          {language === "ro" ? "📊 Analiză Proprietate — Află Scorul și ROI-ul" : "📊 Property Analysis — Get Score & ROI"}
                        </motion.button>
                      )}
                      <div className="flex flex-wrap gap-2 justify-center px-4">
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
                    </div>
                  )}

                  {/* ─── Qualification Wizard ─── */}
                  {showQualificationWizard && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mx-2 mt-6 p-5 rounded-2xl bg-gradient-to-br from-card to-muted/30 border border-primary/20 shadow-xl space-y-4"
                    >
                      <div className="text-center space-y-1">
                        <h3 className="text-lg font-bold text-foreground">
                          {language === "ro" ? "Analiză Proprietate" : "Property Analysis"}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {language === "ro" ? "Completează pentru o analiză personalizată cu scor și ROI" : "Fill in for a personalized score and ROI analysis"}
                        </p>
                      </div>
                      
                      <div className="space-y-3">
                        <Input
                          placeholder={language === "ro" ? "Prenume *" : "First name *"}
                          value={wizardForm.name}
                          onChange={e => setWizardForm(prev => ({ ...prev, name: e.target.value }))}
                          className="h-12 rounded-xl bg-background/50 border-border/50"
                        />
                        <Input
                          type="tel"
                          placeholder={language === "ro" ? "Telefon WhatsApp * (ex: 0723...)" : "WhatsApp phone * (e.g. +40...)"}
                          value={wizardForm.phone}
                          onChange={e => setWizardForm(prev => ({ ...prev, phone: e.target.value }))}
                          className="h-12 rounded-xl bg-background/50 border-border/50"
                        />
                        <select
                          value={wizardForm.zone}
                          onChange={e => setWizardForm(prev => ({ ...prev, zone: e.target.value }))}
                          className="w-full h-12 rounded-xl bg-background/50 border border-border/50 px-3 text-sm text-foreground"
                        >
                          {QUALIFICATION_ZONES.map(z => (
                            <option key={z} value={z}>{z}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => setShowQualificationWizard(false)}
                        >
                          {language === "ro" ? "Anulează" : "Cancel"}
                        </Button>
                        <Button
                          className="flex-1 gap-2"
                          onClick={handleQualificationSubmit}
                          disabled={!wizardForm.name.trim() || !wizardForm.phone.trim()}
                        >
                          <TrendingUp className="w-4 h-4" />
                          {language === "ro" ? "ÎNCEPE ANALIZA" : "START ANALYSIS"}
                        </Button>
                      </div>
                    </motion.div>
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
                  <div className="p-3 md:p-5 border-t border-border/30 bg-muted/10 backdrop-blur-sm">
                  {/* Attached image preview */}
                  {attachedImage && (
                    <div className="mb-3 relative inline-block">
                      <img src={attachedImage} alt="Preview" className="h-16 rounded-xl border border-primary/30 object-cover" />
                      <button
                        onClick={() => setAttachedImage(null)}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-[10px]"
                      >
                        ✕
                      </button>
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-accent">
                        <CheckCircle2 className="w-3 h-3" />
                        {language === "ro" ? "Pregătit pentru analiză vizuală" : "Ready for visual analysis"}
                      </div>
                    </div>
                  )}

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

                  <div className="flex gap-2 items-center">
                    {/* Camera button */}
                    <label className="cursor-pointer h-12 w-12 md:h-14 md:w-14 rounded-2xl bg-muted/50 border border-border/50 flex items-center justify-center hover:bg-primary/10 hover:border-primary/30 transition-all shrink-0" aria-label={language === "ro" ? "Atașează fotografie pentru analiză" : "Attach photo for analysis"}>
                      <Camera className="w-5 h-5 text-primary" />
                      <input
                        ref={fileInputRef}
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={handleImageUpload}
                      />
                    </label>
                    <div className="relative flex-1">
                      <Input
                        ref={inputRef}
                        placeholder={attachedImage 
                          ? (language === "ro" ? "Descrie proprietatea (opțional)..." : "Describe the property (optional)...") 
                          : text.placeholder
                        }
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                        className="h-12 md:h-14 rounded-2xl bg-muted/30 border-border/50 focus-visible:ring-primary/50 text-base pr-12 text-foreground placeholder:text-muted-foreground"
                        disabled={isLoading}
                        maxLength={2000}
                      />
                      <Sparkles className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/30" />
                    </div>
                    <Button
                      size="icon"
                      className="h-12 w-12 md:h-14 md:w-14 rounded-2xl bg-primary text-primary-foreground shadow-xl hover:scale-105 transition-transform shrink-0"
                      onClick={() => handleSend()}
                      disabled={(!input.trim() && !attachedImage) || isLoading}
                    >
                      {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between mt-3 px-1 md:px-2 gap-2">
                    <div className="flex items-center gap-2 opacity-40">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Secured</span>
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[10px] text-muted-foreground">{input.length}/2000</span>
                      <span className="text-muted-foreground/30 mx-1">·</span>
                      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                      <span className="text-[10px] font-bold text-primary truncate">{text.power}</span>
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
