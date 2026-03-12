import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, TrendingUp, Loader2, CheckCircle2, Sparkles, X, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabaseConfig, getSupabasePublishableKey } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

const STREAM_URL = `${supabaseConfig.url}/functions/v1/ai-chatbot-stream`;

interface AnalysisResult {
  text: string;
  report?: {
    scor: number;
    max_scor: number;
    zona: string;
    roi_estimat: string;
    tarif_noapte: number;
    note_consultant: string;
    recomandari: string[];
  } | null;
}

const PhotoPropertyAnalysis = () => {
  const { language } = useLanguage();
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = {
    ro: {
      title: "Analiză Vizuală AI",
      subtitle: "Încarcă o fotografie cu proprietatea ta și primești instant o evaluare AI cu estimare ROI.",
      uploadBtn: "Încarcă Fotografie",
      cameraBtn: "Fotografiază",
      analyzing: "Se analizează imaginea...",
      newAnalysis: "Analiză Nouă",
      ctaWhatsapp: "Discută cu un Consultant",
    },
    en: {
      title: "AI Visual Analysis",
      subtitle: "Upload a photo of your property and get an instant AI evaluation with ROI estimate.",
      uploadBtn: "Upload Photo",
      cameraBtn: "Take Photo",
      analyzing: "Analyzing image...",
      newAnalysis: "New Analysis",
      ctaWhatsapp: "Talk to a Consultant",
    },
  };
  const text = t[language as keyof typeof t] || t.ro;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Max 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
      setResult(null);
      analyzeImage(reader.result as string);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const analyzeImage = async (imageBase64: string) => {
    setIsAnalyzing(true);
    try {
      const apiKey = getSupabasePublishableKey();
      const response = await fetch(STREAM_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          apikey: apiKey || "",
        },
        body: JSON.stringify({
          message: language === "ro" 
            ? "Analizează această proprietate. Evaluează finisajele, starea, potențialul de închiriere și generează un raport complet cu scor." 
            : "Analyze this property. Evaluate finishes, condition, rental potential and generate a complete report with score.",
          language,
          conversationHistory: [],
          pageContext: "/pentru-proprietari",
          imageBase64,
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
                setResult({ text: acc.replace(/<RAPORT_JSON>[\s\S]*?<\/RAPORT_JSON>/g, "").trim(), report: null });
              }
            } catch {}
          }
        }
      }

      // Parse report
      const reportMatch = acc.match(/<RAPORT_JSON>([\s\S]*?)<\/RAPORT_JSON>/);
      let report = null;
      if (reportMatch) {
        try { report = JSON.parse(reportMatch[1].trim()); } catch {}
      }
      setResult({ text: acc.replace(/<RAPORT_JSON>[\s\S]*?<\/RAPORT_JSON>/g, "").trim(), report });
    } catch {
      toast.error(language === "ro" ? "Eroare la analiză" : "Analysis error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setImage(null);
    setResult(null);
  };

  return (
    <section className="py-16 bg-card">
      <div className="container mx-auto px-6 max-w-3xl">
        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            AI · HostScan
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">{text.title}</h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">{text.subtitle}</p>
        </div>

        <div className="bg-background rounded-2xl border border-border/50 overflow-hidden shadow-lg">
          <AnimatePresence mode="wait">
            {!image ? (
              <motion.div
                key="upload"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-8 md:p-12"
              >
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-primary/30 rounded-2xl p-12 text-center cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-all group"
                >
                  <Camera className="w-12 h-12 mx-auto text-primary/40 group-hover:text-primary/60 mb-4 transition-colors" />
                  <p className="font-semibold text-foreground mb-1">{text.uploadBtn}</p>
                  <p className="text-xs text-muted-foreground">JPG, PNG · Max 5MB</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageSelect}
                />
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-6 space-y-5"
              >
                {/* Image preview */}
                <div className="relative">
                  <img src={image} alt="Property" className="w-full h-48 object-cover rounded-xl" />
                  <button onClick={handleReset} className="absolute top-2 right-2 w-8 h-8 bg-background/80 backdrop-blur rounded-full flex items-center justify-center">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Loading */}
                {isAnalyzing && !result && (
                  <div className="flex items-center justify-center gap-3 py-8">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    <span className="text-sm text-primary font-medium">{text.analyzing}</span>
                  </div>
                )}

                {/* Analysis text */}
                {result?.text && (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                    <ReactMarkdown>{result.text}</ReactMarkdown>
                  </div>
                )}

                {/* Report card */}
                {result?.report && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/5 border border-primary/30 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-primary">AI Score</span>
                      <div>
                        <span className="text-2xl font-bold">{result.report.scor}</span>
                        <span className="text-sm text-muted-foreground">/{result.report.max_scor}</span>
                      </div>
                    </div>
                    <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(result.report.scor / result.report.max_scor) * 100}%` }}
                        transition={{ duration: 1 }}
                        className={cn(
                          "h-full rounded-full",
                          result.report.scor >= 100 ? "bg-accent" : "bg-primary"
                        )}
                      />
                    </div>
                    {result.report.recomandari?.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-foreground/80">
                        <CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0" /> {r}
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={handleReset}>{text.newAnalysis}</Button>
                      <Button variant="whatsapp" className="flex-1 gap-2" onClick={() => window.open(`https://wa.me/40723154520?text=${encodeURIComponent(`Scor AI: ${result.report!.scor}/${result.report!.max_scor}. Vreau evaluare detaliată.`)}`)}>
                        <Phone className="w-4 h-4" /> {text.ctaWhatsapp}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default PhotoPropertyAnalysis;
