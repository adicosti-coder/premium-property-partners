import { useState, useMemo } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ChevronRight, ChevronDown } from "lucide-react";

interface Props {
  propertyName: string;
  propertyCode?: string | null;
  defaultPrice?: number;
  defaultRent?: number;
}

const PropertyInvestmentCalculator = ({ propertyName, propertyCode, defaultPrice = 95000, defaultRent = 500 }: Props) => {
  const { language } = useLanguage();
  const [pret, setPret] = useState(defaultPrice);
  const [chirie, setChirie] = useState(defaultRent);
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

  const handleWhatsAppCalc = () => {
    const msg = language === "ro"
      ? `Bună ziua! Analizez proprietatea: ${window.location.href}. Am simulat un yield net de ${yieldNet.toFixed(2)}%. Doresc o consultanță.`
      : `Hello! I'm analyzing the property: ${window.location.href}. I simulated a net yield of ${yieldNet.toFixed(2)}%. I'd like a consultation.`;
    window.open(`https://wa.me/40723154520?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handleWhatsAppSell = () => {
    const msg = language === "ro"
      ? `Bună ziua! Doresc o evaluare pentru o proprietate similară cu cea de pe link: ${window.location.href}. Vă rog să mă contactați.`
      : `Hello! I'd like an evaluation for a property similar to: ${window.location.href}. Please contact me.`;
    window.open(`https://wa.me/40723154520?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const t = language === "ro"
    ? {
        calcTitle: "Analiză Detaliată Investiție",
        pret: "PREȚ ACHIZIȚIE (€)",
        chirie: "CHIRIE ESTIMATĂ (€)",
        toggleCosts: "Ajustează Cheltuieli & Taxe",
        taxeLabel: "Taxe Notariale & Transfer (€)",
        mentenantaLabel: "Mentenanță / Impozit anual (€)",
        yieldLabel: "YIELD NET ANUAL",
        amortLabel: "AMORTIZARE",
        ani: "ani",
        calcCta: "Solicită Analiză Personalizată",
        sellTitle: "Vrei să vinzi prin RealTrust?",
        sellDesc: "Livrăm rapoarte de investiții similare cumpărătorilor noștri pentru a vinde proprietatea ta mai rapid și la prețul corect.",
        sellCta: "EVALUARE GRATUITĂ WHATSAPP",
        defaultRating: "Introduceți cifrele pentru calcul",
      }
    : {
        calcTitle: "Detailed Investment Analysis",
        pret: "PURCHASE PRICE (€)",
        chirie: "ESTIMATED RENT (€)",
        toggleCosts: "Adjust Expenses & Taxes",
        taxeLabel: "Notary & Transfer Taxes (€)",
        mentenantaLabel: "Maintenance / Annual Tax (€)",
        yieldLabel: "NET ANNUAL YIELD",
        amortLabel: "PAYBACK",
        ani: "years",
        calcCta: "Request Personalized Analysis",
        sellTitle: "Want to sell through RealTrust?",
        sellDesc: "We deliver similar investment reports to our buyers to sell your property faster and at the right price.",
        sellCta: "FREE WHATSAPP EVALUATION",
        defaultRating: "Enter figures to calculate",
      };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 my-8">
      {/* Calculator Card */}
      <div className="border border-border p-6 rounded-2xl bg-card shadow-sm">
        <h3 className="text-foreground font-bold text-lg border-b-2 border-amber-500 inline-block pb-1 mb-4">
          {t.calcTitle}
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[11px] font-bold text-muted-foreground">{t.pret}</Label>
            <Input type="number" value={pret} onChange={(e) => setPret(Number(e.target.value))} className="mt-1" />
          </div>
          <div>
            <Label className="text-[11px] font-bold text-muted-foreground">{t.chirie}</Label>
            <Input type="number" value={chirie} onChange={(e) => setChirie(Number(e.target.value))} className="mt-1" />
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
        <div className="bg-slate-900 p-5 rounded-xl text-white text-center mt-5">
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

        <Button onClick={handleWhatsAppCalc} className="w-full mt-4 bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase text-xs">
          {t.calcCta}
        </Button>
      </div>

      {/* Sell Fast Card */}
      <div className="border-2 border-amber-500 p-6 rounded-2xl bg-amber-50 dark:bg-amber-500/5 flex flex-col justify-center">
        <h3 className="text-foreground font-bold text-lg mt-0">{t.sellTitle}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {t.sellDesc}
        </p>
        <Button
          onClick={handleWhatsAppSell}
          className="w-full mt-4 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold shadow-md text-sm"
        >
          {t.sellCta}
        </Button>
      </div>
    </div>
  );
};

export default PropertyInvestmentCalculator;
