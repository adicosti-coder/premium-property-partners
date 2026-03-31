import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, TrendingUp, Loader2, CheckCircle2, Phone, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabaseConfig, getSupabasePublishableKey } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

interface FastTrackScoringProps {
  /** Calculator data to feed into the scoring */
  calculatorData: {
    netProfit: number;
    yearlyNet: number;
    occupancy: number;
    adr: number;
    managementFee?: number;
  };
  /** Optional zone/property context */
  zone?: string;
  propertyType?: string;
  className?: string;
}

interface QuickReport {
  scor: number;
  max_scor: number;
  zona: string;
  roi_estimat: string;
  tarif_noapte: number;
  note_consultant: string;
  recomandari: string[];
  categorie: string;
}

const STREAM_URL = `${supabaseConfig.url}/functions/v1/ai-chatbot-stream`;

const FastTrackScoring = ({ calculatorData, zone = "Timișoara", propertyType = "apartament", className }: FastTrackScoringProps) => {
  const { language } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<QuickReport | null>(null);
  const [showReport, setShowReport] = useState(false);

  const t = {
    ro: {
      btn: "Scor Rapid AI",
      loading: "Se generează scorul...",
      close: "Închide",
      contact: "Contactează Consultant",
    },
    en: {
      btn: "Quick AI Score",
      loading: "Generating score...",
      close: "Close",
      contact: "Contact Consultant",
    },
  };
  const text = t[language as keyof typeof t] || t.ro;

  const handleGenerateScore = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setShowReport(true);

    const prompt = language === "ro"
      ? `FAST-TRACK: Generează imediat un raport structurat cu scor pentru o proprietate tip ${propertyType} în ${zone}. Date calculator: profit net lunar ${calculatorData.netProfit}€, profit anual ${calculatorData.yearlyNet}€, ocupare ${calculatorData.occupancy}%, tarif mediu ${calculatorData.adr}€/noapte. Comision management: ${calculatorData.managementFee || 20}%. Generează RAPORT_JSON obligatoriu.`
      : `FAST-TRACK: Generate an immediate structured report with score for a ${propertyType} property in ${zone}. Calculator data: monthly net profit ${calculatorData.netProfit}€, yearly profit ${calculatorData.yearlyNet}€, occupancy ${calculatorData.occupancy}%, average rate ${calculatorData.adr}€/night. Management fee: ${calculatorData.managementFee || 20}%. Generate RAPORT_JSON mandatory.`;

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
          message: prompt,
          language,
          conversationHistory: [],
          pageContext: "/pentru-proprietari",
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
              if (parsed.delta) acc += parsed.delta;
            } catch {}
          }
        }
      }

      const reportMatch = acc.match(/<RAPORT_JSON>([\s\S]*?)<\/RAPORT_JSON>/);
      if (reportMatch) {
        try {
          setReport(JSON.parse(reportMatch[1].trim()));
        } catch {
          // Fallback: generate from calculator data
          setReport({
            scor: Math.min(140, Math.round(60 + (calculatorData.occupancy * 0.4) + (calculatorData.adr * 0.2))),
            max_scor: 140,
            zona: zone,
            roi_estimat: `${((calculatorData.yearlyNet / (calculatorData.adr * 365 * 0.5)) * 100).toFixed(1)}%`,
            tarif_noapte: calculatorData.adr,
            note_consultant: language === "ro" ? "Proprietate cu potențial bun de randament." : "Property with good yield potential.",
            recomandari: [],
            categorie: calculatorData.netProfit > 1000 ? "Premium" : "Standard",
          });
        }
      } else {
        // Fallback
        setReport({
          scor: Math.min(140, Math.round(60 + (calculatorData.occupancy * 0.4) + (calculatorData.adr * 0.2))),
          max_scor: 140,
          zona: zone,
          roi_estimat: `${((calculatorData.yearlyNet / (calculatorData.adr * 365 * 0.5)) * 100).toFixed(1)}%`,
          tarif_noapte: calculatorData.adr,
          note_consultant: language === "ro" ? "Proprietate cu potențial bun." : "Property with good potential.",
          recomandari: [
            language === "ro" ? "Optimizare preț dinamic" : "Dynamic pricing optimization",
            language === "ro" ? "Fotografie profesională" : "Professional photography",
          ],
          categorie: calculatorData.netProfit > 1000 ? "Premium" : "Standard",
        });
      }
    } catch {
      setShowReport(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={className}>
      {/* Trigger button */}
      {!showReport && (
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            variant="outline"
            className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
            onClick={handleGenerateScore}
            disabled={isLoading}
          >
            <Sparkles className="w-4 h-4" />
            {text.btn}
          </Button>
        </motion.div>
      )}

      {/* Report overlay */}
      <AnimatePresence>
        {showReport && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-4 p-5 rounded-2xl bg-gradient-to-br from-primary/10 via-card to-accent/5 border border-primary/30 shadow-xl space-y-4 relative"
          >
            <button onClick={() => { setShowReport(false); setReport(null); }} className="absolute top-3 right-3">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>

            {isLoading && !report ? (
              <div className="flex items-center justify-center gap-3 py-6">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                <span className="text-sm text-primary font-medium">{text.loading}</span>
              </div>
            ) : report ? (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-primary">AI Score</span>
                  </div>
                  <div>
                    <span className="text-3xl font-bold text-foreground">{report.scor}</span>
                    <span className="text-sm text-muted-foreground">/{report.max_scor}</span>
                  </div>
                </div>

                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(report.scor / report.max_scor) * 100}%` }}
                    transition={{ duration: 1 }}
                    className={cn("h-full rounded-full", report.scor >= 100 ? "bg-accent" : "bg-primary")}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-background/50 rounded-xl p-2 border border-border/30">
                    <MapPin className="w-3.5 h-3.5 mx-auto text-muted-foreground mb-0.5" />
                    <p className="text-xs font-bold">{report.zona}</p>
                  </div>
                  <div className="bg-background/50 rounded-xl p-2 border border-border/30">
                    <TrendingUp className="w-3.5 h-3.5 mx-auto text-accent mb-0.5" />
                    <p className="text-xs font-bold">{report.roi_estimat}</p>
                  </div>
                  <div className="bg-background/50 rounded-xl p-2 border border-border/30">
                    <span className="text-xs">€</span>
                    <p className="text-xs font-bold">{report.tarif_noapte}€</p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-3">"{report.note_consultant}"</p>

                {report.recomandari?.length > 0 && (
                  <div className="space-y-1">
                    {report.recomandari.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-foreground/80">
                        <CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0" /> {r}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => { setShowReport(false); setReport(null); }}>
                    {text.close}
                  </Button>
                  <Button variant="whatsapp" size="sm" className="flex-1 gap-1" onClick={() => window.open(`https://wa.me/40723154520?text=${encodeURIComponent(`Scor AI: ${report.scor}/${report.max_scor} | ROI: ${report.roi_estimat} | ${report.tarif_noapte}€/noapte`)}`, '_blank', 'noopener,noreferrer')}>
                    <Phone className="w-3.5 h-3.5" /> {text.contact}
                  </Button>
                </div>
              </>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FastTrackScoring;
