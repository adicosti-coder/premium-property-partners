import { useState, useMemo } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const InvestmentQuickCalculator = () => {
  const { language } = useLanguage();
  const [pret, setPret] = useState(95000);
  const [chirie, setChirie] = useState(500);
  const [expenses, setExpenses] = useState(50);
  const [strategy, setStrategy] = useState<"clasic" | "hotel">("clasic");

  const calc = useMemo(() => {
    if (!pret || !chirie) return null;

    const cBruta = strategy === "hotel" ? chirie * 1.65 : chirie;
    const factorNet = strategy === "hotel" ? 0.72 : 0.95;
    const invTotal = pret * 1.02;

    const vNetAnual = (cBruta * 12) * factorNet;
    const yieldVal = (vNetAnual / invTotal) * 100;
    const ani = vNetAnual > 0 ? invTotal / vNetAnual : 0;
    const cash = cBruta - (pret * 0.75 * 0.00632) - expenses;

    const fVal = pret * Math.pow(1.04, 15);
    const totalProf = (fVal + (vNetAnual * 15)) - invTotal;

    const progressPercent = Math.min(100, (yieldVal / 10) * 100);

    let verdict = "";
    if (yieldVal >= 7.5) {
      verdict = language === "ro"
        ? "<strong>Verdict: Oportunitate Majoră.</strong> Randamentul net este net superior mediei pieței."
        : "<strong>Verdict: Major Opportunity.</strong> Net yield is well above market average.";
    } else if (yieldVal >= 5.5) {
      verdict = language === "ro"
        ? "<strong>Verdict: Randament Stabil.</strong> Proprietate cu profil de risc scăzut."
        : "<strong>Verdict: Stable Yield.</strong> Low-risk property profile.";
    } else {
      verdict = language === "ro"
        ? "<strong>Verdict: Achiziție Rezidențială.</strong> Beneficiu mai mare prin locuire proprie."
        : "<strong>Verdict: Residential Purchase.</strong> Greater benefit from own use.";
    }

    const cashNote = cash > 0
      ? (language === "ro" ? " Cashflow pozitiv." : " Positive cashflow.")
      : (language === "ro" ? " Cashflow restrictiv." : " Restrictive cashflow.");

    return { yieldVal, ani, fVal, totalProf, progressPercent, verdict: verdict + cashNote };
  }, [pret, chirie, expenses, strategy, language]);

  const yieldColor = useMemo(() => {
    if (!calc) return "text-emerald-500";
    if (calc.yieldVal >= 7.5) return "text-emerald-500";
    if (calc.yieldVal >= 5.5) return "text-amber-500";
    return "text-red-500";
  }, [calc]);

  const barColor = useMemo(() => {
    if (!calc) return "bg-emerald-500";
    if (calc.yieldVal >= 7.5) return "bg-emerald-500";
    if (calc.yieldVal >= 5.5) return "bg-amber-500";
    return "bg-red-500";
  }, [calc]);

  const handleWhatsApp = () => {
    const yieldText = calc ? calc.yieldVal.toFixed(2) + "%" : "0%";
    const msg = language === "ro"
      ? `Bună ziua! Am finalizat analiza RealTrust (Randament: ${yieldText}). Doresc o consultanță.`
      : `Hello! I completed the RealTrust analysis (Yield: ${yieldText}). I'd like a consultation.`;
    window.open(`https://wa.me/40723154520?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const t = language === "ro" ? {
    title: "Analiză Investițională RealTrust",
    propValue: "💰 Valoare Proprietate (€)",
    rent: "🔑 Chirie Lunară (€)",
    adminExp: "💸 Cheltuieli Admin (€/lună)",
    clasic: "🏠 Chirie Clasică",
    hotel: "🌟 Regim Hotelier",
    yieldNet: "Yield Net:",
    amort: "Amortizare:",
    capitalTitle: "Apreciere Capital (15 ani)",
    futureVal: "Valoare Estimată:",
    totalProfit: "Profit Total:",
    cta: "📩 Contact WhatsApp",
    expertName: "Adrian Costi",
    expertRole: "Investment Specialist @ RealTrust & ApArt Hotel",
  } : {
    title: "RealTrust Investment Analysis",
    propValue: "💰 Property Value (€)",
    rent: "🔑 Monthly Rent (€)",
    adminExp: "💸 Admin Expenses (€/mo)",
    clasic: "🏠 Classic Rental",
    hotel: "🌟 Hotel Strategy",
    yieldNet: "Net Yield:",
    amort: "Payback:",
    capitalTitle: "Capital Appreciation (15 yrs)",
    futureVal: "Estimated Value:",
    totalProfit: "Total Profit:",
    cta: "📩 Contact WhatsApp",
    expertName: "Adrian Costi",
    expertRole: "Investment Specialist @ RealTrust & ApArt Hotel",
  };

  return (
    <div className="max-w-[1000px] mx-auto my-8 bg-card rounded-[20px] p-6 md:p-10 shadow-xl border border-border relative">
      {/* Brand */}
      <div className="text-right font-bold text-foreground text-lg -mb-2">
        REAL<span className="text-amber-500">TRUST</span>
      </div>

      <h2 className="text-center text-foreground border-b-4 border-amber-500 inline-block pb-2 uppercase tracking-wider text-lg md:text-xl font-bold mb-6 mx-auto block w-fit">
        {t.title}
      </h2>

      {/* Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-muted/50 p-5 rounded-2xl mb-6 border border-border">
        <div>
          <Label className="font-bold text-[11px] text-muted-foreground uppercase">{t.propValue}</Label>
          <Input type="number" value={pret} onChange={(e) => setPret(Number(e.target.value))} className="mt-1 text-base font-bold" />
        </div>
        <div>
          <Label className="font-bold text-[11px] text-muted-foreground uppercase">{t.rent}</Label>
          <Input type="number" value={chirie} onChange={(e) => setChirie(Number(e.target.value))} className="mt-1 text-base font-bold" />
        </div>
        <div>
          <Label className="font-bold text-[11px] text-muted-foreground uppercase">{t.adminExp}</Label>
          <Input type="number" value={expenses} onChange={(e) => setExpenses(Number(e.target.value))} className="mt-1 text-base font-bold" />
        </div>
      </div>

      {/* Strategy Toggle */}
      <div className="flex justify-center gap-3 mb-6">
        <button
          onClick={() => setStrategy("clasic")}
          className={`px-5 py-3 rounded-full font-bold text-sm transition-all duration-300 border-none cursor-pointer ${
            strategy === "clasic" ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-lg" : "bg-muted text-muted-foreground"
          }`}
        >
          {t.clasic}
        </button>
        <button
          onClick={() => setStrategy("hotel")}
          className={`px-5 py-3 rounded-full font-bold text-sm transition-all duration-300 border-none cursor-pointer ${
            strategy === "hotel" ? "bg-amber-500 text-white shadow-lg" : "bg-muted text-muted-foreground"
          }`}
        >
          {t.hotel}
        </button>
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="p-5 border border-border rounded-[18px] bg-card border-t-[5px] border-t-amber-500">
          <div className="flex justify-between items-baseline">
            <span className="text-sm">{t.yieldNet}</span>
            <b className={`text-[26px] ${yieldColor}`}>{calc ? calc.yieldVal.toFixed(2) + "%" : "-"}</b>
          </div>
          <div className="w-full h-2.5 bg-muted rounded-full mt-3 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${calc ? calc.progressPercent : 0}%` }} />
          </div>
          <div className="mt-3 text-sm">{t.amort} <b>{calc ? calc.ani.toFixed(1) + (language === "ro" ? " ani" : " yrs") : "-"}</b></div>
        </div>

        <div className="p-5 border border-border rounded-[18px] bg-card border-t-[5px] border-t-slate-900 dark:border-t-white">
          <h4 className="m-0 mb-3 text-[12px] text-muted-foreground uppercase">{t.capitalTitle}</h4>
          <div className="text-sm mb-1">{t.futureVal} <b className="float-right text-amber-500">{calc ? Math.round(calc.fVal).toLocaleString() + " €" : "-"}</b></div>
          <div className="text-sm">{t.totalProfit}</div>
          <b className="text-[26px] text-foreground block mt-1">{calc ? Math.round(calc.totalProf).toLocaleString() + " €" : "-"}</b>
        </div>
      </div>

      {/* Expert Verdict */}
      <div className="mt-6 p-6 rounded-[16px] bg-amber-50 dark:bg-amber-500/5 border border-dashed border-amber-500">
        <div className="text-foreground leading-7 italic text-sm" dangerouslySetInnerHTML={{ __html: calc ? calc.verdict : "..." }} />
        <div className="mt-4 flex items-center gap-2">
          <div className="w-8 h-8 bg-slate-900 dark:bg-white rounded-full text-white dark:text-slate-900 flex items-center justify-center font-bold text-[10px]">AC</div>
          <div className="text-[12px] text-muted-foreground"><strong>{t.expertName}</strong> — {t.expertRole}</div>
        </div>
      </div>

      <Button onClick={handleWhatsApp} className="w-full mt-6 py-5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-gray-200 dark:text-slate-900 text-white font-bold text-base rounded-xl">
        {t.cta}
      </Button>
    </div>
  );
};

export default InvestmentQuickCalculator;
