import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Send, Camera, TrendingUp, MapPin, CheckCircle2, 
  Bot, User, Loader2, ArrowRight, Building2, Phone,
  Sparkles, RotateCcw, Star, ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabaseConfig, getSupabasePublishableKey } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { lazy, Suspense } from "react";

const PhotoPropertyAnalysis = lazy(() => import("@/components/PhotoPropertyAnalysis"));
const HostScanMiniMap = lazy(() => import("@/components/HostScanMiniMap"));

const STREAM_URL = `${supabaseConfig.url}/functions/v1/ai-chatbot-stream`;
const ZONES = ["Fructus Plaza", "Paltim", "Centru", "Iulius Town", "City of Mara", "Nord-One", "Monarch", "Ateneo", "Vivalia", "Altă zonă"];

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
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

const parseReport = (text: string): PropertyReport | null => {
  const match = text.match(/<RAPORT_JSON>([\s\S]*?)<\/RAPORT_JSON>/);
  if (!match) return null;
  try { return JSON.parse(match[1].trim()); } catch { return null; }
};
const cleanReport = (text: string) => text.replace(/<RAPORT_JSON>[\s\S]*?<\/RAPORT_JSON>/g, "").trim();

const AnalizaProprietate = () => {
  const { language } = useLanguage();
  const [step, setStep] = useState<"wizard" | "chat">("wizard");
  const [form, setForm] = useState({ name: "", phone: "", zone: "Fructus Plaza", rooms: "2" });
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<PropertyReport | null>(null);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (step === "chat" && inputRef.current) inputRef.current.focus();
  }, [step]);

  const t = {
    ro: {
      pageTitle: "Analiză Proprietate AI | RealTrust",
      pageDesc: "Analizează potențialul proprietății tale cu AI. Scor, ROI estimat și recomandări personalizate.",
      heroTitle: "Analiză AI",
      heroHighlight: "Proprietate",
      heroSubtitle: "Scor inteligent, ROI estimat și recomandări personalizate în timp real.",
      nameLabel: "Prenume *",
      phoneLabel: "Telefon WhatsApp *",
      zoneLabel: "Zona proprietății",
      roomsLabel: "Număr camere",
      startBtn: "ÎNCEPE ANALIZA AI",
      placeholder: "Descrie proprietatea ta...",
      imagePlaceholder: "Adaugă detalii despre imagine...",
      imageReady: "Imagine pregătită pentru analiză vizuală",
    },
    en: {
      pageTitle: "AI Property Analysis | RealTrust",
      pageDesc: "Analyze your property potential with AI. Score, estimated ROI and personalized recommendations.",
      heroTitle: "AI Property",
      heroHighlight: "Analysis",
      heroSubtitle: "Intelligent scoring, estimated ROI and personalized recommendations in real-time.",
      nameLabel: "First name *",
      phoneLabel: "WhatsApp phone *",
      zoneLabel: "Property zone",
      roomsLabel: "Number of rooms",
      startBtn: "START AI ANALYSIS",
      placeholder: "Describe your property...",
      imagePlaceholder: "Add details about the image...",
      imageReady: "Image ready for visual analysis",
    },
  };
  const text = t[language as keyof typeof t] || t.ro;

  const handleStartAnalysis = () => {
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error(language === "ro" ? "Completează numele și telefonul" : "Fill in name and phone");
      return;
    }
    setStep("chat");
    const introMsg = language === "ro"
      ? `Salut! Sunt ${form.name}. Am un apartament cu ${form.rooms} camere în zona ${form.zone}. Vreau o analiză completă cu scor și ROI estimat.`
      : `Hi! I'm ${form.name}. I have a ${form.rooms}-room apartment in ${form.zone}. I'd like a complete analysis with score and estimated ROI.`;
    handleSend(introMsg);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(language === "ro" ? "Max 5MB" : "Max 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAttachedImage(reader.result as string);
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = async (overrideMessage?: string) => {
    const content = overrideMessage || input.trim();
    const hasImage = !!attachedImage;
    if (!content && !hasImage) return;

    const currentImage = attachedImage;
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: content || (language === "ro" ? "Am atașat o imagine." : "I attached an image."),
      imagePreview: currentImage || undefined,
    };
    const assistantId = crypto.randomUUID();
    setMessages(prev => [...prev, userMsg, { id: assistantId, role: "assistant", content: "" }]);
    setInput("");
    setAttachedImage(null);
    setIsLoading(true);

    try {
      const apiKey = getSupabasePublishableKey();
      const response = await fetch(STREAM_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          apikey: apiKey || "",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          message: content || "",
          language,
          conversationHistory: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
          pageContext: "/analiza-proprietate",
          imageBase64: hasImage ? currentImage : undefined,
          qualificationContext: { name: form.name, phone: form.phone, zone: form.zone },
        }),
      });

      if (!response.ok) throw new Error("network");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      let buffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let idx: number;
          while ((idx = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") break;
            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed.delta) {
                acc += parsed.delta;
                setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: acc } : m));
              }
            } catch {}
          }
        }
      }

      const parsedReport = parseReport(acc);
      if (parsedReport) {
        setReport(parsedReport);
        acc = cleanReport(acc);
      }
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: acc || "..." } : m));
    } catch {
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: language === "ro" ? "Eroare. Încearcă din nou." : "Error. Try again." } : m));
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setStep("wizard");
    setMessages([]);
    setReport(null);
    setInput("");
    setAttachedImage(null);
  };

  return (
    <>
      <SEOHead
        title={text.pageTitle}
        description={text.pageDesc}
        url="https://www.realtrust.ro/analiza-proprietate"
        faqItems={[
          {
            question: language === "ro" ? "Ce este HostScan AI?" : "What is HostScan AI?",
            answer: language === "ro"
              ? "HostScan AI este un instrument gratuit care analizează potențialul apartamentului tău pentru regim hotelier în Timișoara, oferind un scor din 140 de puncte, ROI estimat și recomandări personalizate."
              : "HostScan AI is a free tool that analyzes your apartment's potential for short-term rental in Timișoara, providing a score out of 140 points, estimated ROI and personalized recommendations.",
          },
          {
            question: language === "ro" ? "Cât costă analiza AI?" : "How much does the AI analysis cost?",
            answer: language === "ro"
              ? "Analiza HostScan AI este complet gratuită și confidențială. Nu este nevoie de cont sau card de plată."
              : "The HostScan AI analysis is completely free and confidential. No account or payment card required.",
          },
          {
            question: language === "ro" ? "Cât durează analiza?" : "How long does the analysis take?",
            answer: language === "ro"
              ? "Analiza durează aproximativ 2 minute. Primești scorul proprietății, estimarea randamentului lunar și recomandări concrete de optimizare."
              : "The analysis takes approximately 2 minutes. You receive the property score, monthly yield estimate and concrete optimization recommendations.",
          },
        ]}
        breadcrumbItems={[
          { name: language === "ro" ? "Acasă" : "Home", url: "https://www.realtrust.ro" },
          { name: language === "ro" ? "Pentru Proprietari" : "For Owners", url: "https://www.realtrust.ro/pentru-proprietari" },
          { name: language === "ro" ? "Analiză AI Proprietate" : "AI Property Analysis", url: "https://www.realtrust.ro/analiza-proprietate" },
        ]}
      />
      <Header />
      <main className="min-h-screen bg-background pt-20">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8 space-y-3"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5" />
              HostScan AI
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              {text.heroTitle} <span className="text-primary">{text.heroHighlight}</span>
            </h1>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">{text.heroSubtitle}</p>
          </motion.div>

          {/* Main Card */}
          <motion.div
            layout
            className="bg-card border border-border/50 rounded-3xl shadow-2xl overflow-hidden"
          >
            <AnimatePresence mode="wait">
              {step === "wizard" ? (
                <motion.div
                  key="wizard"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-6 md:p-8 space-y-5"
                >
                  <div className="grid grid-cols-1 gap-4">
                    <Input
                      placeholder={text.nameLabel}
                      value={form.name}
                      onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                      className="h-13 rounded-xl"
                    />
                    <Input
                      type="tel"
                      placeholder={text.phoneLabel}
                      value={form.phone}
                      onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="h-13 rounded-xl"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground font-medium mb-1.5 block">{text.zoneLabel}</label>
                        <select
                          value={form.zone}
                          onChange={e => setForm(prev => ({ ...prev, zone: e.target.value }))}
                          className="w-full h-12 rounded-xl bg-background border border-border px-3 text-sm text-foreground"
                        >
                          {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground font-medium mb-1.5 block">{text.roomsLabel}</label>
                        <select
                          value={form.rooms}
                          onChange={e => setForm(prev => ({ ...prev, rooms: e.target.value }))}
                          className="w-full h-12 rounded-xl bg-background border border-border px-3 text-sm text-foreground"
                        >
                          {["Studio", "1", "2", "3", "4+"].map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="xl"
                    className="w-full gap-2"
                    onClick={handleStartAnalysis}
                    disabled={!form.name.trim() || !form.phone.trim()}
                  >
                    <TrendingUp className="w-5 h-5" />
                    {text.startBtn}
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="chat"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col h-[70vh]"
                >
                  {/* Chat header */}
                  <div className="p-4 border-b border-border/30 flex items-center justify-between bg-muted/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                        <Bot className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-foreground">HostScan AI</h3>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{form.zone} · {form.rooms} cam</span>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="rounded-xl" onClick={handleReset}>
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map(m => (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn("flex gap-3", m.role === "user" ? "flex-row-reverse" : "flex-row")}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                          m.role === "user" ? "bg-muted" : "bg-primary text-primary-foreground"
                        )}>
                          {m.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                        </div>
                        <div className={cn(
                          "max-w-[85%] p-3 px-4 rounded-2xl text-sm",
                          m.role === "user"
                            ? "bg-primary text-primary-foreground rounded-tr-none"
                            : "bg-muted/50 border border-border/30 rounded-tl-none"
                        )}>
                          {m.imagePreview && (
                            <img src={m.imagePreview} alt="Property" className="rounded-xl max-h-32 mb-2 w-full object-cover" />
                          )}
                          <div className="prose prose-sm dark:prose-invert max-w-none [&_table]:w-full [&_table]:border-collapse [&_table]:text-xs [&_table]:my-3 [&_th]:bg-muted [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-semibold [&_th]:border [&_th]:border-border/50 [&_td]:px-2 [&_td]:py-1.5 [&_td]:border [&_td]:border-border/50 [&_table]:rounded-lg [&_table]:overflow-hidden">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content || "..."}</ReactMarkdown>
                          </div>
                        </div>
                      </motion.div>
                    ))}

                    {/* Inline map after first AI response */}
                    {messages.length >= 2 && messages.some(m => m.role === "assistant" && m.content.length > 50) && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="my-2"
                      >
                        <Suspense fallback={null}>
                          <HostScanMiniMap zone={report?.zona || form.zone} />
                        </Suspense>
                      </motion.div>
                    )}

                    {/* Report Card */}
                    {report && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-5 rounded-2xl bg-gradient-to-br from-primary/10 via-card to-accent/5 border border-primary/30 shadow-xl space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-primary" />
                            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-primary">
                              {language === "ro" ? "Raport Finalizat" : "Report Complete"}
                            </span>
                          </div>
                          <div>
                            <span className="text-3xl font-bold text-foreground">{report.scor}</span>
                            <span className="text-sm text-muted-foreground">/{report.max_scor}</span>
                          </div>
                        </div>
                        <div className="h-3 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(report.scor / report.max_scor) * 100}%` }}
                            transition={{ duration: 1.2, ease: "easeOut" }}
                            className={cn(
                              "h-full rounded-full",
                              report.scor >= 100 ? "bg-accent" : report.scor >= 70 ? "bg-primary" : "bg-destructive"
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div className="bg-background/50 rounded-xl p-3 border border-border/30">
                            <MapPin className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                            <p className="text-sm font-bold text-foreground">{report.zona}</p>
                          </div>
                          <div className="bg-background/50 rounded-xl p-3 border border-border/30">
                            <TrendingUp className="w-4 h-4 mx-auto text-accent mb-1" />
                            <p className="text-sm font-bold text-foreground">{report.roi_estimat}</p>
                          </div>
                          <div className="bg-background/50 rounded-xl p-3 border border-border/30">
                            <span className="text-lg">€</span>
                            <p className="text-sm font-bold text-foreground">{report.tarif_noapte}€</p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-3">"{report.note_consultant}"</p>
                        {report.recomandari?.length > 0 && (
                          <div className="space-y-1.5">
                            {report.recomandari.map((rec, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs text-foreground/80">
                                <CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0" /> {rec}
                              </div>
                            ))}
                          </div>
                        )}
                        <Button
                          variant="whatsapp"
                          size="lg"
                          className="w-full gap-2"
                          onClick={() => window.open(`https://wa.me/40723154520?text=${encodeURIComponent(
                            `Scor HostScan: ${report.scor}/${report.max_scor} | ${report.zona} | ROI: ${report.roi_estimat} | ${form.name} - ${form.phone}`
                          )}`)}
                        >
                          <Phone className="w-4 h-4" />
                          {language === "ro" ? "CONTACTEAZĂ ADRIAN" : "CONTACT ADRIAN"}
                        </Button>
                      </motion.div>
                    )}

                    {isLoading && messages[messages.length - 1]?.content === "" && (
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                          <Bot className="w-4 h-4 text-primary-foreground" />
                        </div>
                        <div className="bg-muted/50 rounded-2xl rounded-tl-none border border-border/30 px-4 py-3">
                          <div className="flex gap-1.5">
                            {[0, 1, 2].map(i => (
                              <motion.div key={i} className="w-2 h-2 rounded-full bg-primary/60" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={scrollRef} />
                  </div>

                  {/* Input — always visible in chat mode */}
                  <div className="p-4 border-t border-border/30">
                    {attachedImage && (
                      <div className="mb-2 relative inline-block">
                        <img src={attachedImage} alt="Preview" className="h-14 rounded-xl border border-primary/30 object-cover" />
                        <button onClick={() => setAttachedImage(null)} className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-destructive text-destructive-foreground rounded-full text-[8px] flex items-center justify-center">✕</button>
                        <p className="text-[10px] text-accent flex items-center gap-1 mt-0.5"><CheckCircle2 className="w-3 h-3" />{text.imageReady}</p>
                      </div>
                    )}
                    <div className="flex gap-2 items-center">
                      <label className="cursor-pointer h-12 w-12 rounded-xl bg-muted/50 border border-border/50 flex items-center justify-center hover:bg-primary/10 transition-all shrink-0">
                        <Camera className="w-5 h-5 text-primary" />
                        <input ref={fileInputRef} type="file" hidden accept="image/*" capture="environment" onChange={handleImageUpload} />
                      </label>
                      <Input
                        ref={inputRef}
                        placeholder={attachedImage ? text.imagePlaceholder : text.placeholder}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") handleSend(); }}
                        className="h-12 rounded-xl"
                        disabled={isLoading}
                      />
                      <Button
                        size="icon"
                        className="h-12 w-12 rounded-xl"
                        onClick={() => handleSend()}
                        disabled={(!input.trim() && !attachedImage) || isLoading}
                      >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Photo AI Analysis — visible in wizard step, before social proof */}
          {step === "wizard" && (
            <div className="mt-8">
              <Suspense fallback={null}>
                <PhotoPropertyAnalysis />
              </Suspense>
            </div>
          )}

          {/* Social Proof Section */}
          {step === "wizard" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-10 space-y-6"
            >
              {/* Trust indicators */}
              <div className="grid grid-cols-3 gap-4 text-center">
                {[
                  { value: "140", label: language === "ro" ? "Puncte Scor" : "Score Points", icon: "📊" },
                  { value: "50+", label: language === "ro" ? "Proprietăți Analizate" : "Properties Analyzed", icon: "🏠" },
                  { value: "2 min", label: language === "ro" ? "Timp Analiză" : "Analysis Time", icon: "⚡" },
                ].map((stat) => (
                  <div key={stat.label} className="p-4 rounded-2xl bg-card border border-border/50">
                    <span className="text-2xl">{stat.icon}</span>
                    <p className="text-xl font-bold text-foreground mt-1">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* How it works */}
              <div className="bg-card border border-border/50 rounded-2xl p-6">
                <h3 className="font-bold text-foreground text-center mb-4">
                  {language === "ro" ? "Cum funcționează?" : "How does it work?"}
                </h3>
                <div className="space-y-3">
                  {(language === "ro" ? [
                    { step: "1", text: "Completezi datele de bază ale proprietății" },
                    { step: "2", text: "AI-ul analizează zona, piața și potențialul" },
                    { step: "3", text: "Primești scor din 140, ROI estimat și recomandări" },
                  ] : [
                    { step: "1", text: "Fill in your property's basic details" },
                    { step: "2", text: "AI analyzes the area, market and potential" },
                    { step: "3", text: "Get a score out of 140, estimated ROI and recommendations" },
                  ]).map((item) => (
                    <div key={item.step} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center shrink-0">
                        {item.step}
                      </div>
                      <p className="text-sm text-muted-foreground">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA bottom */}
              <p className="text-center text-xs text-muted-foreground">
                {language === "ro" 
                  ? "🔒 Datele tale sunt confidențiale. Nu trimitem spam." 
                  : "🔒 Your data is confidential. We don't send spam."}
              </p>
            </motion.div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
};

export default AnalizaProprietate;
