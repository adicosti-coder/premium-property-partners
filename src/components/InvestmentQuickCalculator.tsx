import { useState, useMemo } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ChevronRight, ChevronDown } from "lucide-react";

const InvestmentQuickCalculator = () => {
  const { language } = useLanguage();
  const [pret, setPret] = useState(95000);
  const [chirie, setChirie] = useState(500);
  const [taxe, setTaxe] = useState(2000);
  const [mentenanta, setMentenanta] = useState(600);
  const [showCosts, setShowCosts] = useState(false);

  const { yieldNet, aniAmortizare, rating, ratingColor, progressPercent } = useMemo(() => {
    if (pret <= 0 || chirie <= 0) {
      return { yieldNet: 0, aniAmortizare: 0, rating: "", ratingColor: "text-amber-500", progressPercent: 0 };
    }
    const investitieTotala = pret + taxe;
    const venitNetAnual = (chirie * 12) - mentenanta;
    const yieldNet = investitieTotala > 0 ? (venitNetAnual / investitieTotala) * 100 : 0;
    const aniAmortizare = venitNetAnual > 0 ? investitieTotala / venitNetAnual : 0;
    const progressPercent = Math.min(Math.max((yieldNet / 10) * 100, 0), 100);

    let rating = "";
    let ratingColor = "text-amber-500";
    if (yieldNet >= 7.5) {
      rating = language === "ro" ? "INVESTIȚIE EXCELENTĂ 🔥" : "EXCELLENT INVESTMENT 🔥";
      ratingColor = "text-emerald-400";
    } else if (yieldNet >= 5) {
      rating = language === "ro" ? "RANDAMENT OPTIM 👍" : "OPTIMAL YIELD 👍";
      ratingColor = "text-amber-500";
    } else {
      rating = language === "ro" ? "RANDAMENT SUB MEDIE" : "BELOW AVERAGE YIELD";
      ratingColor = "text-red-400";
    }

    return { yieldNet, aniAmortizare, rating, ratingColor, progressPercent };
  }, [pret, chirie, taxe, mentenanta, language]);

  const progressBarColor = useMemo(() => {
    if (yieldNet >= 7.5) return "bg-emerald-400";
    if (yieldNet >= 5) return "bg-amber-500";
    return "bg-red-400";
  }, [yieldNet]);

  const handleWhatsApp = () => {
    const msg = language === "ro"
      ? `Bună ziua! Analizez o proprietate de investiție. Am simulat un yield net de ${yieldNet.toFixed(2)}%. Doresc o consultanță.`
      : `Hello! I'm analyzing an investment property. I simulated a net yield of ${yieldNet.toFixed(2)}%. I'd like a consultation.`;
    window.open(`https://wa.me/40723154520?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const t = language === "ro"
    ? {
        title: "Analiză Detaliată Investiție",
        subtitle: "Vezi în cât timp se plătește singură această proprietate",
        pret: "PREȚ ACHIZIȚIE (€)",
        chirie: "CHIRIE ESTIMATĂ (€)",
        toggleCosts: "Ajustează Cheltuieli & Taxe",
        taxeLabel: "Taxe Notariale & Transfer (€)",
        mentenantaLabel: "Mentenanță / Impozit anual (€)",
        yieldLabel: "YIELD NET ANUAL",
        amortLabel: "AMORTIZARE",
        ani: "ani",
        cta: "Solicită Analiză Personalizată",
        defaultRating: "Introduceți cifrele pentru calcul",
      }
    : {
        title: "Detailed Investment Analysis",
        subtitle: "See how quickly this property pays for itself",
        pret: "PURCHASE PRICE (€)",
        chirie: "ESTIMATED RENT (€)",
        toggleCosts: "Adjust Expenses & Taxes",
        taxeLabel: "Notary & Transfer Taxes (€)",
        mentenantaLabel: "Maintenance / Annual Tax (€)",
        yieldLabel: "NET ANNUAL YIELD",
        amortLabel: "PAYBACK",
        ani: "years",
        cta: "Request Personalized Analysis",
        defaultRating: "Enter figures to calculate",
      };

  return (
    <div className="w-full border border-dashed border-amber-500 p-6 md:p-8 rounded-xl bg-card">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-foreground">{t.title}</h3>
        <p className="text-sm text-muted-foreground">{t.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-[11px] font-bold text-muted-foreground">{t.pret}</Label>
          <Input type="number" value={pret} onChange={e => setPret(Number(e.target.value))} className="mt-1" />
        </div>
        <div>
          <Label className="text-[11px] font-bold text-muted-foreground">{t.chirie}</Label>
          <Input type="number" value={chirie} onChange={e => setChirie(Number(e.target.value))} className="mt-1" />
        </div>
      </div>

      {/* Expandable Costs */}
      <div className="mt-4">
        <button
          onClick={() => setShowCosts(!showCosts)}
          className="flex items-center gap-1 text-xs text-amber-500 font-bold cursor-pointer bg-transparent border-none p-0"
        >
          {showCosts ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          {t.toggleCosts}
        </button>
        {showCosts && (
          <div className="mt-2 p-3 bg-muted/50 rounded-lg space-y-2">
            <div>
              <Label className="text-[10px] text-muted-foreground">{t.taxeLabel}</Label>
              <Input type="number" value={taxe} onChange={(e) => setTaxe(Number(e.target.value))} className="mt-0.5 h-8 text-sm" />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">{t.mentenantaLabel}</Label>
              <Input type="number" value={mentenanta} onChange={(e) => setMentenanta(Number(e.target.value))} className="mt-0.5 h-8 text-sm" />
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="mt-5 bg-slate-900 p-5 rounded-xl text-white text-center">
        <div className="flex justify-around">
          <div>
            <span className="text-[10px] text-slate-400">{t.yieldLabel}</span>
            <div className={`text-2xl font-bold ${pret > 0 && chirie > 0 ? ratingColor : "text-amber-500"}`}>
              {yieldNet.toFixed(2)}%
            </div>
          </div>
          <div className="border-l border-slate-700 pl-4">
            <span className="text-[10px] text-slate-400">{t.amortLabel}</span>
            <div className="text-xl font-bold text-white">
              {aniAmortizare.toFixed(1)} {t.ani}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-slate-700 rounded-full mt-4">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progressBarColor}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-[11px] text-slate-400 mt-2 font-bold">
          {pret > 0 && chirie > 0 ? rating : t.defaultRating}
        </p>
      </div>

      <Button onClick={handleWhatsApp} className="w-full mt-4 bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase text-xs">
        {t.cta}
      </Button>
    </div>
  );
};

export default InvestmentQuickCalculator;
