import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Sparkles, RotateCcw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabaseConfig, getSupabasePublishableKey } from "@/lib/supabaseClient";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import HostScanUploader from "./hostscan/HostScanUploader";
import HostScanReportCard from "./hostscan/HostScanReportCard";
import HostScanContextChat from "./hostscan/HostScanContextChat";

const STREAM_URL = `${supabaseConfig.url}/functions/v1/ai-chatbot-stream`;
const REPORT_URL = `${supabaseConfig.url}/functions/v1/hostscan-report`;

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

interface AnalysisResult {
  text: string;
  report: PropertyReport | null;
}

const PhotoPropertyAnalysis = () => {
  const { language } = useLanguage();
  const [images, setImages] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [email, setEmail] = useState("");
  const [gdprConsent, setGdprConsent] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const t = {
    ro: {
      title: "Analiză Vizuală AI",
      subtitle: "Încarcă până la 20 de fotografii cu proprietatea ta și primești instant evaluare AI cu scor, ROI și recomandări.",
      analyzeBtn: "ANALIZEAZĂ CU AI",
      analyzing: "Se analizează",
      newAnalysis: "Analiză Nouă",
      emailLabel: "Email pentru raport (opțional)",
      gdprText: "Sunt de acord cu prelucrarea datelor conform GDPR pentru primirea raportului.",
      gdprLink: "Politica de confidențialitate",
      imageCount: (n: number) => `${n} fotografi${n === 1 ? "e" : "i"}`,
    },
    en: {
      title: "AI Visual Analysis",
      subtitle: "Upload up to 20 photos of your property and get instant AI evaluation with score, ROI and recommendations.",
      analyzeBtn: "ANALYZE WITH AI",
      analyzing: "Analyzing",
      newAnalysis: "New Analysis",
      emailLabel: "Email for report (optional)",
      gdprText: "I agree to GDPR data processing to receive the report.",
      gdprLink: "Privacy policy",
      imageCount: (n: number) => `${n} photo${n === 1 ? "" : "s"}`,
    },
  };
  const text = t[language as keyof typeof t] || t.ro;

  const analyzeImages = useCallback(async () => {
    if (images.length === 0) {
      toast.error(language === "ro" ? "Adaugă cel puțin o fotografie" : "Add at least one photo");
      return;
    }

    setIsAnalyzing(true);
    setProgress(0);
    setResult(null);

    // Animate progress
    const progressInterval = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) { clearInterval(progressInterval); return 90; }
        return p + Math.random() * 8;
      });
    }, 300);

    try {
      const apiKey = getSupabasePublishableKey();

      const imagePrompt = images.length === 1
        ? (language === "ro"
          ? "Analizează această proprietate. Evaluează finisajele, starea, potențialul de închiriere și generează un raport complet cu scor."
          : "Analyze this property. Evaluate finishes, condition, rental potential and generate a complete report with score.")
        : (language === "ro"
          ? `Analizează aceste ${images.length} fotografii ale proprietății. Evaluează finisajele, designul interior, starea generală, potențialul de închiriere și generează un raport complet cu scor.`
          : `Analyze these ${images.length} property photos. Evaluate finishes, interior design, overall condition, rental potential and generate a complete report with score.`);

      // For multiple images, send only the first image via imageBase64 and reference the count
      // The edge function supports single image; for multi-image we send the first and mention the count
      const response = await fetch(STREAM_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          apikey: apiKey || "",
        },
        body: JSON.stringify({
          message: imagePrompt,
          language,
          conversationHistory: [],
          pageContext: "/pentru-proprietari",
          imageBase64: images[0], // Primary image for vision analysis
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
                setResult({
                  text: acc.replace(/<RAPORT_JSON>[\s\S]*?<\/RAPORT_JSON>/g, "").trim(),
                  report: null,
                });
              }
            } catch {}
          }
        }
      }

      clearInterval(progressInterval);
      setProgress(100);

      // Parse report
      const reportMatch = acc.match(/<RAPORT_JSON>([\s\S]*?)<\/RAPORT_JSON>/);
      let report: PropertyReport | null = null;
      if (reportMatch) {
        try { report = JSON.parse(reportMatch[1].trim()); } catch {}
      }
      setResult({
        text: acc.replace(/<RAPORT_JSON>[\s\S]*?<\/RAPORT_JSON>/g, "").trim(),
        report,
      });
    } catch {
      clearInterval(progressInterval);
      toast.error(language === "ro" ? "Eroare la analiză" : "Analysis error");
    } finally {
      setIsAnalyzing(false);
    }
  }, [images, language]);

  const handleSendEmail = async () => {
    if (!email.trim() || !result?.report) return;
    if (!gdprConsent) {
      toast.error(language === "ro" ? "Trebuie să accepți politica GDPR" : "You must accept the GDPR policy");
      return;
    }

    setIsSendingEmail(true);
    try {
      const apiKey = getSupabasePublishableKey();
      const res = await fetch(REPORT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          apikey: apiKey || "",
        },
        body: JSON.stringify({
          recipientEmail: email.trim(),
          recipientName: "",
          report: result.report,
          zone: result.report.zona,
          language,
        }),
      });

      if (!res.ok) throw new Error("send failed");
      setEmailSent(true);
      toast.success(language === "ro" ? "Raport trimis pe email!" : "Report sent to email!");
    } catch {
      toast.error(language === "ro" ? "Eroare la trimitere" : "Send error");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleReset = () => {
    setImages([]);
    setResult(null);
    setProgress(0);
    setEmail("");
    setGdprConsent(false);
    setEmailSent(false);
  };

  return (
    <section className="py-16 bg-card">
      <div className="container mx-auto px-6 max-w-3xl">
        {/* Header */}
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
            {!result ? (
              <motion.div
                key="upload"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-6 md:p-8 space-y-5"
              >
                <HostScanUploader
                  images={images}
                  onImagesChange={setImages}
                  maxImages={20}
                  language={language}
                />

                {/* Progress bar during analysis */}
                {isAnalyzing && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-primary font-medium flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        {text.analyzing}... {text.imageCount(images.length)}
                      </span>
                      <span className="text-muted-foreground font-mono">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-primary"
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                )}

                {/* Email + GDPR */}
                <div className="space-y-3">
                  <Input
                    type="email"
                    placeholder={text.emailLabel}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 rounded-xl"
                  />
                  <label className="flex items-start gap-2 cursor-pointer">
                    <Checkbox
                      checked={gdprConsent}
                      onCheckedChange={(checked) => setGdprConsent(!!checked)}
                      className="mt-0.5"
                    />
                    <span className="text-xs text-muted-foreground leading-relaxed">
                      <ShieldCheck className="w-3 h-3 inline mr-1 text-accent" />
                      {text.gdprText}{" "}
                      <a
                        href="/politica-confidentialitate"
                        target="_blank"
                        className="text-primary underline hover:no-underline"
                      >
                        {text.gdprLink}
                      </a>
                    </span>
                  </label>
                </div>

                <Button
                  size="xl"
                  className="w-full gap-2"
                  onClick={analyzeImages}
                  disabled={images.length === 0 || isAnalyzing}
                >
                  {isAnalyzing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Sparkles className="w-5 h-5" />
                  )}
                  {isAnalyzing ? `${text.analyzing}...` : text.analyzeBtn}
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-6 space-y-5"
              >
                {/* Image preview grid */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {images.slice(0, 6).map((img, i) => (
                    <img
                      key={i}
                      src={img}
                      alt={`Property ${i + 1}`}
                      className="h-20 w-28 object-cover rounded-xl shrink-0 border border-border/30"
                    />
                  ))}
                  {images.length > 6 && (
                    <div className="h-20 w-28 rounded-xl bg-muted/50 flex items-center justify-center shrink-0 text-sm font-bold text-muted-foreground">
                      +{images.length - 6}
                    </div>
                  )}
                </div>

                {/* Analysis text (streaming) */}
                {result.text && (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                    <ReactMarkdown>{result.text}</ReactMarkdown>
                  </div>
                )}

                {/* Loading indicator */}
                {isAnalyzing && !result.report && (
                  <div className="flex items-center gap-3 py-2">
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    <span className="text-sm text-primary font-medium">
                      {text.analyzing}...
                    </span>
                  </div>
                )}

                {/* Report Card */}
                {result.report && (
                  <>
                    <HostScanReportCard
                      report={result.report}
                      language={language}
                      onSendEmail={email.trim() && gdprConsent ? handleSendEmail : undefined}
                      isSendingEmail={isSendingEmail}
                      emailSent={emailSent}
                    />

                    {/* Contextual Chat */}
                    <HostScanContextChat
                      report={result.report}
                      analysisText={result.text}
                      language={language}
                    />
                  </>
                )}

                {/* Reset */}
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleReset}
                >
                  <RotateCcw className="w-4 h-4" />
                  {text.newAnalysis}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default PhotoPropertyAnalysis;
