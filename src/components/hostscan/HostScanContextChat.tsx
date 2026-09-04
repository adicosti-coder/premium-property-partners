import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { supabaseConfig, getSupabasePublishableKey } from "@/lib/supabaseClient";

const STREAM_URL = `${supabaseConfig.url}/functions/v1/ai-chatbot-stream`;

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface PropertyReport {
  scor: number;
  max_scor: number;
  zona: string;
  roi_estimat: string;
  tarif_noapte: number;
  note_consultant: string;
  recomandari: string[];
  categorie?: string;
}

interface Props {
  report: PropertyReport;
  analysisText: string;
  language: string;
  ownerName?: string;
  zone?: string;
}

const HostScanContextChat = ({ report, analysisText, language, ownerName, zone }: Props) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const t = {
    ro: {
      title: "Consultant AI — Analiza Ta",
      subtitle: "Întrebări personalizate bazate pe raportul proprietății",
      placeholder: "Ex: Ce renovări ar crește cel mai mult scorul?",
      open: "💬 Discută cu consultantul AI despre scorul tău",
      suggestions: [
        "🎯 Ce acțiuni concrete îmi cresc scorul cel mai rapid?",
        "💰 Ce investiție minimă ar avea cel mai mare impact pe ROI?",
        "📊 Cum se compară zona mea cu alte zone din Timișoara?",
        "📸 Ce îmbunătățiri vizuale atrag mai mulți oaspeți?",
      ],
    },
    en: {
      title: "AI Consultant — Your Analysis",
      subtitle: "Personalized questions based on your property report",
      placeholder: "Ex: What renovations would boost my score most?",
      open: "💬 Chat with AI consultant about your score",
      suggestions: [
        "🎯 What concrete actions increase my score fastest?",
        "💰 What minimum investment would have the biggest ROI impact?",
        "📊 How does my area compare to other zones in Timișoara?",
        "📸 What visual improvements attract more guests?",
      ],
    },
  };
  const text = t[language as keyof typeof t] || t.ro;

  const handleSend = async (overrideMsg?: string) => {
    const content = overrideMsg || input.trim();
    if (!content || isLoading) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content };
    const assistantId = crypto.randomUUID();
    setMessages((prev) => [...prev, userMsg, { id: assistantId, role: "assistant", content: "" }]);
    setInput("");
    setIsLoading(true);

    try {
      const contextPrefix = language === "ro"
        ? `[Context analiză: Scor ${report.scor}/${report.max_scor}, Zonă ${report.zona}, ROI ${report.roi_estimat}, Tarif ${report.tarif_noapte}€/noapte, Categorie: ${report.categorie || "Standard"}. Recomandări: ${report.recomandari?.join("; ")}. Nota consultant: ${report.note_consultant}]\n\nÎntrebarea utilizatorului: `
        : `[Analysis context: Score ${report.scor}/${report.max_scor}, Zone ${report.zona}, ROI ${report.roi_estimat}, Rate ${report.tarif_noapte}€/night, Category: ${report.categorie || "Standard"}. Recommendations: ${report.recomandari?.join("; ")}. Consultant note: ${report.note_consultant}]\n\nUser question: `;

      const apiKey = getSupabasePublishableKey();
      const response = await fetch(STREAM_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          apikey: apiKey || "",
        },
        body: JSON.stringify({
          message: contextPrefix + content,
          language,
          conversationHistory: messages.slice(-8).map((m) => ({ role: m.role, content: m.content })),
          pageContext: "/hostscan-ai",
          qualificationContext: { name: ownerName, zone },
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
                setMessages((prev) =>
                  prev.map((m) => (m.id === assistantId ? { ...m, content: acc } : m))
                );
              }
            } catch {}
          }
        }
      }

      // Clean report tags if present
      const cleaned = acc.replace(/<RAPORT_JSON>[\s\S]*?<\/RAPORT_JSON>/g, "").trim();
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: cleaned || "..." } : m))
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: language === "ro" ? "Eroare. Încearcă din nou." : "Error. Try again." }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => setIsOpen(true)}
        className="w-full p-4 rounded-2xl border border-primary/20 bg-primary/5 text-primary text-sm font-semibold hover:bg-primary/10 transition-colors text-center"
      >
        {text.open}
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="rounded-2xl border border-border/50 overflow-hidden bg-card"
    >
      {/* Header */}
      <div className="p-3 border-b border-border/30 bg-muted/5">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <div>
            <p className="text-sm font-bold text-foreground">{text.title}</p>
            <p className="text-[10px] text-muted-foreground">{text.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Suggestions (when no messages) */}
      {messages.length === 0 && (
        <div className="p-3 space-y-1.5">
          {text.suggestions.map((s) => (
            <button
              key={s}
              onClick={() => handleSend(s)}
              className="w-full text-left text-xs p-2.5 rounded-xl bg-muted/30 hover:bg-primary/10 text-foreground/80 transition-colors"
            >
              → {s}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      {messages.length > 0 && (
        <div className="max-h-64 overflow-y-auto p-3 space-y-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn("flex gap-2", m.role === "user" ? "flex-row-reverse" : "flex-row")}
            >
              <div
                className={cn(
                  "w-6 h-6 rounded-md flex items-center justify-center shrink-0",
                  m.role === "user" ? "bg-muted" : "bg-primary text-primary-foreground"
                )}
              >
                {m.role === "user" ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
              </div>
              <div
                className={cn(
                  "max-w-[85%] p-2.5 rounded-xl text-xs",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-none"
                    : "bg-muted/50 border border-border/30 rounded-tl-none"
                )}
              >
                <div className="prose prose-xs dark:prose-invert max-w-none">
                  <ReactMarkdown>{m.content || "..."}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-border/30 flex gap-2">
        <Input
          ref={inputRef}
          placeholder={text.placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
          className="h-10 rounded-xl text-xs"
          disabled={isLoading}
        />
        <Button
          size="icon"
          className="h-10 w-10 rounded-xl shrink-0"
          onClick={() => handleSend()}
          disabled={!input.trim() || isLoading}
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </motion.div>
  );
};

export default HostScanContextChat;
