import { useState, useMemo } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

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
  const [expenses, setExpenses] = useState(50);
  const [strategy, setStrategy] = useState<"clasic" | "hotel">("clasic");
  const [clientName, setClientName] = useState("");

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
        ? "<strong>Verdict: Oportunitate Majoră.</strong> Randamentul net este net superior mediei pieței. Recomandăm acest activ pentru un portofoliu performant."
        : "<strong>Verdict: Major Opportunity.</strong> The net yield is well above the market average. We recommend this asset for a high-performance portfolio.";
    } else if (yieldVal >= 5.5) {
      verdict = language === "ro"
        ? "<strong>Verdict: Randament Stabil.</strong> Această proprietate se încadrează în profilul de risc scăzut, oferind o capitalizare sigură în Timișoara."
        : "<strong>Verdict: Stable Yield.</strong> This property fits a low-risk profile, offering safe capitalization in Timișoara.";
    } else {
      verdict = language === "ro"
        ? "<strong>Verdict: Achiziție Rezidențială.</strong> Cifrele sugerează un beneficiu mai mare prin locuire proprie sau o strategie de revânzare după apreciere."
        : "<strong>Verdict: Residential Purchase.</strong> The numbers suggest greater benefit from own use or a resale strategy after appreciation.";
    }

    const cashNote = cash > 0
      ? (language === "ro" ? " Cashflow-ul este pozitiv, facilitând creditarea." : " Cashflow is positive, facilitating financing.")
      : (language === "ro" ? " Cashflow restrictiv în scenariul actual." : " Restrictive cashflow in the current scenario.");

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

  const t = language === "ro" ? {
    title: "Analiză Investițională RealTrust",
    reportPrefix: "Raport: ",
    namePlaceholder: "Numele dumneavoastră (pentru raport personalizat)",
    propValue: "💰 Valoare Proprietate (€)",
    rent: "🔑 Chirie Lunară (€)",
    adminExp: "💸 Cheltuieli Admin (€/lună)",
    clasic: "🏠 Chirie Clasică",
    hotel: "🌟 Regim Hotelier",
    perfTitle: "Performanță Anuală",
    yieldNet: "Yield Net:",
    amort: "Amortizare:",
    capitalTitle: "Apreciere Capital (15 ani)",
    futureVal: "Valoare Estimată:",
    totalProfit: "Profit Total (Rent+Equity):",
    roadmapTitle: "📋 Pașii Următori către Achiziție",
    step1Title: "01. VIZIONARE",
    step1Desc: "Programăm o întâlnire pentru a verifica starea tehnică și finisajele.",
    step2Title: "02. ANALIZĂ ACTE",
    step2Desc: "Echipa noastră verifică istoricul proprietății și CF-ul.",
    step3Title: "03. MANAGEMENT",
    step3Desc: "Configurăm strategia ApArt Hotel sau selectăm chiriașul ideal.",
    analyzing: "Se analizează indicatorii...",
    expertName: "Adrian Costi",
    expertRole: "Investment Specialist @ RealTrust & ApArt Hotel",
    ctaWhatsApp: "📩 Contact WhatsApp",
    ctaPdf: "📄 Salvează PDF",
  } : {
    title: "RealTrust Investment Analysis",
    reportPrefix: "Report: ",
    namePlaceholder: "Your name (for personalized report)",
    propValue: "💰 Property Value (€)",
    rent: "🔑 Monthly Rent (€)",
    adminExp: "💸 Admin Expenses (€/month)",
    clasic: "🏠 Classic Rental",
    hotel: "🌟 Hotel Strategy",
    perfTitle: "Annual Performance",
    yieldNet: "Net Yield:",
    amort: "Payback:",
    capitalTitle: "Capital Appreciation (15 yrs)",
    futureVal: "Estimated Value:",
    totalProfit: "Total Profit (Rent+Equity):",
    roadmapTitle: "📋 Next Steps to Acquisition",
    step1Title: "01. VIEWING",
    step1Desc: "We schedule a meeting to verify the technical condition and finishes.",
    step2Title: "02. DUE DILIGENCE",
    step2Desc: "Our team verifies property history and land registry.",
    step3Title: "03. MANAGEMENT",
    step3Desc: "We configure the ApArt Hotel strategy or select the ideal tenant.",
    analyzing: "Analyzing indicators...",
    expertName: "Adrian Costi",
    expertRole: "Investment Specialist @ RealTrust & ApArt Hotel",
    ctaWhatsApp: "📩 Contact WhatsApp",
    ctaPdf: "📄 Save PDF",
  };

  const displayTitle = clientName ? `${t.reportPrefix}${clientName}` : t.title;

  const handleWhatsApp = () => {
    const name = clientName || "Client";
    const yieldText = calc ? calc.yieldVal.toFixed(2) + "%" : "0%";
    const msg = language === "ro"
      ? `Bună ziua! Sunt ${name}. Am finalizat analiza RealTrust (Randament: ${yieldText}) și doresc să programăm o vizionare pentru: ${window.location.href}`
      : `Hello! I'm ${name}. I completed the RealTrust analysis (Yield: ${yieldText}) and would like to schedule a viewing for: ${window.location.href}`;
    window.open(`https://wa.me/40799069256?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  };

  const handlePdf = () => window.print();

  return (
    <div className="max-w-[1000px] mx-auto my-8 bg-card rounded-[20px] p-4 sm:p-6 md:p-10 shadow-xl border border-border relative print:shadow-none print:border-none print:p-5 overflow-hidden">
      {/* Brand */}
      <div className="text-right font-bold text-foreground text-xl -mb-2">
        REAL<span className="text-amber-500">TRUST</span>
      </div>

      {/* Title */}
      <div className="text-center mb-8">
        <h2 className="inline-block text-foreground border-b-4 border-amber-500 pb-2 uppercase tracking-wider text-xl md:text-2xl font-bold m-0">
          {displayTitle}
        </h2>
        <div className="mt-5 print:hidden">
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder={t.namePlaceholder}
            className="px-3 py-3 w-full max-w-[320px] border border-border rounded-lg text-center text-sm bg-background text-foreground outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-muted/50 p-6 rounded-2xl mb-8 border border-border">
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

      {/* Strategy Buttons */}
      <div className="flex justify-center gap-4 mb-8 print:hidden">
        <button
          onClick={() => setStrategy("clasic")}
          className={`px-7 py-3.5 rounded-full font-bold transition-all duration-300 border-none cursor-pointer ${
            strategy === "clasic"
              ? "bg-slate-900 text-white shadow-lg dark:bg-white dark:text-slate-900"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {t.clasic}
        </button>
        <button
          onClick={() => setStrategy("hotel")}
          className={`px-7 py-3.5 rounded-full font-bold transition-all duration-300 border-none cursor-pointer ${
            strategy === "hotel"
              ? "bg-amber-500 text-white shadow-lg"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {t.hotel}
        </button>
      </div>

      {/* Results Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Annual Performance */}
        <div className="p-6 border border-border rounded-[18px] bg-card border-t-[5px] border-t-amber-500">
          <h4 className="m-0 mb-4 text-[13px] text-muted-foreground uppercase">{t.perfTitle}</h4>
          <div className="flex justify-between items-baseline">
            <span className="text-[15px]">{t.yieldNet}</span>
            <b className={`text-[28px] ${yieldColor}`}>
              {calc ? calc.yieldVal.toFixed(2) + "%" : "-"}
            </b>
          </div>
          <div className="w-full h-2.5 bg-muted rounded-full mt-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
              style={{ width: `${calc ? calc.progressPercent : 0}%` }}
            />
          </div>
          <div className="mt-4 text-sm">
            {t.amort} <b>{calc ? calc.ani.toFixed(1) + (language === "ro" ? " ani" : " yrs") : "-"}</b>
          </div>
        </div>

        {/* Capital Appreciation */}
        <div className="p-6 border border-border rounded-[18px] bg-card border-t-[5px] border-t-slate-900 dark:border-t-white">
          <h4 className="m-0 mb-4 text-[13px] text-muted-foreground uppercase">{t.capitalTitle}</h4>
          <div className="text-sm mb-2">
            {t.futureVal} <b className="float-right text-amber-500">{calc ? Math.round(calc.fVal).toLocaleString() + " €" : "-"}</b>
          </div>
          <div className="text-sm">{t.totalProfit}</div>
          <b className="text-[28px] text-foreground block my-1">
            {calc ? Math.round(calc.totalProf).toLocaleString() + " €" : "-"}
          </b>
        </div>
      </div>

      {/* Roadmap */}
      <div className="mt-9 p-6 bg-muted/50 rounded-2xl border border-border">
        <h4 className="m-0 mb-4 text-foreground uppercase text-[13px] tracking-wider inline-block border-b-2 border-amber-500">
          {t.roadmapTitle}
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <div className="text-xs text-muted-foreground">
            <b className="text-foreground block mb-1">{t.step1Title}</b>
            {t.step1Desc}
          </div>
          <div className="text-xs text-muted-foreground">
            <b className="text-foreground block mb-1">{t.step2Title}</b>
            {t.step2Desc}
          </div>
          <div className="text-xs text-muted-foreground">
            <b className="text-foreground block mb-1">{t.step3Title}</b>
            {t.step3Desc}
          </div>
        </div>
      </div>

      {/* Expert Note */}
      <div className="mt-8 p-8 rounded-[20px] bg-amber-50 dark:bg-amber-500/5 border border-dashed border-amber-500 relative">
        <div
          className="text-foreground leading-7 italic"
          dangerouslySetInnerHTML={{ __html: calc ? calc.verdict : (language === "ro" ? "Se analizează indicatorii..." : "Analyzing indicators...") }}
        />
        <div className="mt-5 flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 dark:bg-white rounded-full text-white dark:text-slate-900 flex items-center justify-center font-bold text-xs">AC</div>
          <div className="text-[13px] text-muted-foreground">
            <strong>{t.expertName}</strong> — {t.expertRole}
          </div>
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-10 print:hidden">
        <Button
          onClick={handleWhatsApp}
          className="py-6 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-gray-200 dark:text-slate-900 text-white font-bold text-base rounded-xl"
        >
          {t.ctaWhatsApp}
        </Button>
        <Button
          onClick={handlePdf}
          className="py-6 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-base rounded-xl"
        >
          {t.ctaPdf}
        </Button>
      </div>
    </div>
  );
};

export default PropertyInvestmentCalculator;
