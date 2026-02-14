import { useState, useMemo, useEffect } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, CartesianGrid } from "recharts";
import { TrendingUp, Download, MessageCircle, Trophy, X } from "lucide-react";

interface Props {
  propertyName?: string;
  propertyCode?: string | null;
  defaultPrice?: number;
  defaultRent?: number;
  /** Hide the property recommendations section (e.g. on property detail pages) */
  hideRecommendations?: boolean;
}

interface DbProperty {
  id: string;
  name: string;
  capital_necesar: number | null;
  estimated_revenue: string | null;
  listing_type: string | null;
  status_operativ: string | null;
}

interface RankedProperty {
  name: string;
  price: number;
  yieldVal: number;
  netMonthly: number;
}

const InvestmentEngineV34 = ({
  propertyName,
  propertyCode,
  defaultPrice = 120000,
  defaultRent = 550,
  hideRecommendations = false,
}: Props) => {
  const { language } = useLanguage();
  const [budget, setBudget] = useState(defaultPrice);
  const [chirie, setChirie] = useState(defaultRent);
  const [advance, setAdvance] = useState(25);
  const [interest, setInterest] = useState(6.5);
  const [strategy, setStrategy] = useState<"clasic" | "hotel">("clasic");
  const [clientName, setClientName] = useState("");
  const [simCount, setSimCount] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const [dbProperties, setDbProperties] = useState<DbProperty[]>([]);

  // Fetch DB properties for recommendations
  useEffect(() => {
    if (hideRecommendations) return;
    const fetchProps = async () => {
      const { data } = await supabase
        .from("properties")
        .select("id, name, capital_necesar, estimated_revenue, listing_type, status_operativ")
        .eq("is_active", true)
        .order("display_order");
      if (data) setDbProperties(data);
    };
    fetchProps();
  }, [hideRecommendations]);

  const calc = useMemo(() => {
    if (!budget || budget < 10000 || !chirie || chirie < 50) return null;

    const chirieEfectiva = strategy === "hotel" ? chirie * 1.65 : chirie;
    const factorNet = strategy === "hotel" ? 0.72 : 0.95;
    const invTotal = budget * 1.02;

    const credit = budget * (1 - advance / 100);
    const r = (interest / 100) / 12;
    const rata = credit > 0 && r > 0
      ? (credit * (r * Math.pow(1 + r, 300)) / (Math.pow(1 + r, 300) - 1))
      : 0;

    const venitNetLunar = chirieEfectiva * factorNet;
    const cashflow = venitNetLunar - rata;
    const yieldAnual = (venitNetLunar * 12) / invTotal * 100;

    const valViitoare = budget * Math.pow(1.04, 15);
    const profitAcumulat = (cashflow * 12) * 15;
    const avereTotala = valViitoare + profitAcumulat;

    return { chirieEfectiva, rata, venitNetLunar, cashflow, yieldAnual, valViitoare, avereTotala, factorNet };
  }, [budget, chirie, advance, interest, strategy]);

  // Ranked properties from DB
  const rankedProperties = useMemo((): RankedProperty[] => {
    if (hideRecommendations || !dbProperties.length) return [];
    const r = (interest / 100) / 12;
    const factorNet = strategy === "hotel" ? 0.72 : 0.95;

    return dbProperties
      .filter(p => p.capital_necesar && p.capital_necesar > 0 && p.estimated_revenue)
      .map(p => {
        const price = p.capital_necesar!;
        const rent = parseFloat(p.estimated_revenue!.replace(/[^0-9.]/g, "")) || 0;
        if (!rent) return null;
        const ch = strategy === "hotel" ? rent * 1.65 : rent;
        const credit = price * (1 - advance / 100);
        const pmt = credit > 0 && r > 0
          ? credit * (r * Math.pow(1 + r, 300)) / (Math.pow(1 + r, 300) - 1)
          : 0;
        const netM = (ch * factorNet) - pmt;
        const yv = (ch * factorNet * 12) / (price * 1.02) * 100;
        return { name: p.name, price, yieldVal: yv, netMonthly: netM };
      })
      .filter(Boolean)
      .sort((a, b) => b!.yieldVal - a!.yieldVal)
      .slice(0, 3) as RankedProperty[];
  }, [dbProperties, advance, interest, strategy, hideRecommendations]);

  // Trigger popup after 5 simulations
  useEffect(() => {
    if (simCount >= 5 && !showPopup) setShowPopup(true);
  }, [simCount]);

  const handleInputChange = (setter: (v: number) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(Number(e.target.value));
    setSimCount(c => c + 1);
  };

  const verdict = useMemo(() => {
    if (!calc) return "";
    const { yieldAnual, cashflow } = calc;
    let msg = "";
    if (yieldAnual >= 7.5) {
      msg = language === "ro"
        ? "<b>Oportunitate de TOP.</b> Cifrele indică o profitabilitate rară. Recomandăm strategia <b>ApArt Hotel</b> pentru a maximiza randamentul net și a profita de fluxul turistic din Timișoara."
        : "<b>TOP Opportunity.</b> The numbers indicate rare profitability. We recommend the <b>ApArt Hotel</b> strategy to maximize net yield and capitalize on Timișoara's tourism flow.";
    } else if (yieldAnual >= 5.5) {
      msg = language === "ro"
        ? "<b>Investiție Echilibrată.</b> Un activ corect și stabil, ideal pentru protecția capitalului. Managementul nostru asigură un cashflow predictibil pe termen lung."
        : "<b>Balanced Investment.</b> A solid and stable asset, ideal for capital protection. Our management ensures predictable long-term cashflow.";
    } else {
      msg = language === "ro"
        ? "<b>Achiziție Strategică.</b> Randament curent moderat, recomandat pentru apreciere în timp sau utilizare mixtă."
        : "<b>Strategic Acquisition.</b> Moderate current yield, recommended for long-term appreciation or mixed use.";
    }
    if (cashflow > 0) {
      msg += language === "ro"
        ? " Proprietatea generează cashflow pozitiv (se autofinanțează)."
        : " The property generates positive cashflow (self-financing).";
    }
    return msg;
  }, [calc, language]);

  const chartData = useMemo(() => {
    if (!calc) return [];
    return [
      { name: "RealTrust & ApArt", value: parseFloat(calc.yieldAnual.toFixed(2)) },
      { name: language === "ro" ? "Bancă (Depozit)" : "Bank (Deposit)", value: 5.0 },
    ];
  }, [calc, language]);

  const handleWhatsApp = () => {
    const name = clientName || (language === "ro" ? "Investitor" : "Investor");
    const yieldText = calc ? calc.yieldAnual.toFixed(2) + "%" : "";
    const propContext = propertyCode ? `[${propertyCode}] ` : "";
    const msg = language === "ro"
      ? `Bună Adrian! Sunt ${name}. ${propContext}Am simulat un randament de ${yieldText} pe RealTrust & ApArt Hotel și doresc detalii despre vizionare.`
      : `Hello Adrian! I'm ${name}. ${propContext}I simulated a ${yieldText} yield on RealTrust & ApArt Hotel and would like viewing details.`;
    window.open(`https://wa.me/40723154520?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const t = language === "ro" ? {
    title: "RealTrust & ApArt Hotel",
    reportPrefix: "Raport Investiție pentru: ",
    analysisTitle: "Analiză de Profitabilitate",
    namePlaceholder: "Numele dumneavoastră (pentru raport PDF)",
    budget: "💰 Buget (€)",
    rent: "🔑 Chirie Estimată (€/lună)",
    advance: "🏦 Avans Credit (%)",
    interest: "📈 Dobândă Anuală (%)",
    clasic: "Închiriere Clasică",
    hotel: "Regim Hotelier (ApArt Hotel)",
    strategy: "Strategie",
    yieldNet: "Randament Net",
    totalWealth: "Avere Totală în 15 ani",
    cashflow: "Cashflow Lunar Net",
    topProperties: "Top Proprietăți Recomandate",
    chartTitle: "Comparație Grafică: Imobiliare vs Bancă",
    aboveAvg: "Randament Peste Medie",
    price: "Preț",
    yield: "Randament",
    cashflowNet: "Cashflow Net",
    perMonth: "/lună",
    expertTitle: "Verdictul Expertului RealTrust & ApArt Hotel",
    expertName: "Adrian Costi",
    expertRole: "Investment Specialist @ RealTrust & ApArt Hotel",
    ctaPdf: "📄 SALVEAZĂ PDF",
    ctaWhatsApp: "💬 CONTACT WHATSAPP",
    disclaimer: "NOTĂ JURIDICĂ ȘI CLAUZĂ DE NERESPONSABILITATE:",
    disclaimer1: "Prezenta simulare reprezintă o analiză matematică bazată pe indicatori statistici și nu constituie o ofertă fermă sau o garanție de profit din partea RealTrust & ApArt Hotel.",
    disclaimer2: "Calculele privind creditarea sunt estimative. Ratele și dobânzile (IRCC/ROBOR) depind exclusiv de politicile băncilor comerciale și de profilul de risc al clientului.",
    disclaimer3: "Performanța în regim hotelier este direct influențată de sezonalitate și presupune un management profesional conform standardelor ApArt Hotel.",
    popupTitle: "Analiză Finalizată!",
    popupDesc: "Indicatorii arată un potențial peste media pieței. Vrei să programăm o vizionare pentru proprietățile din această categorie?",
    popupCta: "DA, SUNT INTERESAT",
    popupDismiss: "Mai analizez puțin",
  } : {
    title: "RealTrust & ApArt Hotel",
    reportPrefix: "Investment Report for: ",
    analysisTitle: "Profitability Analysis",
    namePlaceholder: "Your name (for PDF report)",
    budget: "💰 Budget (€)",
    rent: "🔑 Estimated Rent (€/month)",
    advance: "🏦 Down Payment (%)",
    interest: "📈 Annual Interest (%)",
    clasic: "Classic Rental",
    hotel: "Hotel Strategy (ApArt Hotel)",
    strategy: "Strategy",
    yieldNet: "Net Yield",
    totalWealth: "Total Wealth in 15 yrs",
    cashflow: "Monthly Net Cashflow",
    topProperties: "Top Recommended Properties",
    chartTitle: "Chart: Real Estate vs Bank",
    aboveAvg: "Above Average Yield",
    price: "Price",
    yield: "Yield",
    cashflowNet: "Net Cashflow",
    perMonth: "/mo",
    expertTitle: "RealTrust & ApArt Hotel Expert Verdict",
    expertName: "Adrian Costi",
    expertRole: "Investment Specialist @ RealTrust & ApArt Hotel",
    ctaPdf: "📄 SAVE PDF",
    ctaWhatsApp: "💬 CONTACT WHATSAPP",
    disclaimer: "LEGAL NOTICE AND DISCLAIMER:",
    disclaimer1: "This simulation represents a mathematical analysis based on statistical indicators and does not constitute a firm offer or profit guarantee from RealTrust & ApArt Hotel.",
    disclaimer2: "Credit calculations are estimates. Rates and interest depend exclusively on commercial bank policies and the client's risk profile.",
    disclaimer3: "Performance in hotel mode is directly influenced by seasonality and requires professional management per ApArt Hotel standards.",
    popupTitle: "Analysis Complete!",
    popupDesc: "Indicators show above-market potential. Would you like to schedule a viewing for properties in this category?",
    popupCta: "YES, I'M INTERESTED",
    popupDismiss: "I'll analyze more",
  };

  const displayTitle = clientName ? `${t.reportPrefix}${clientName}` : t.analysisTitle;

  return (
    <>
      <div className="max-w-[950px] mx-auto my-8 space-y-6 print:space-y-4">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground to-amber-500 bg-clip-text text-transparent inline-block">
            {t.title}
          </h2>
        </div>

        {/* Client Name Card */}
        <div className="bg-card border border-border rounded-2xl p-6 text-center shadow-lg print:hidden">
          <Label className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
            {language === "ro" ? "Nume Investitor (pentru Raport PDF)" : "Investor Name (for PDF Report)"}
          </Label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder={t.namePlaceholder}
            className="mt-2 px-4 py-3 w-full max-w-[400px] bg-background border border-border rounded-xl text-center text-sm text-foreground outline-none focus:ring-2 focus:ring-amber-500 mx-auto block"
          />
        </div>

        {/* Inputs Card */}
        <div className="bg-card border border-border rounded-2xl p-5 sm:p-7 shadow-lg print:hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <Label className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">{t.budget}</Label>
              <Input type="number" value={budget} onChange={handleInputChange(setBudget)} className="mt-1 text-base font-bold" />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">{t.rent}</Label>
              <Input type="number" value={chirie} onChange={handleInputChange(setChirie)} className="mt-1 text-base font-bold" />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">{t.advance}</Label>
              <Input type="number" value={advance} onChange={handleInputChange(setAdvance)} className="mt-1 text-base font-bold" />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">{t.interest}</Label>
              <Input type="number" value={interest} onChange={handleInputChange(setInterest)} className="mt-1 text-base font-bold" />
            </div>
          </div>

          {/* Strategy Buttons */}
          <div className="flex gap-3 mt-2">
            <button
              onClick={() => { setStrategy("clasic"); setSimCount(c => c + 1); }}
              className={`flex-1 py-3.5 rounded-full font-bold text-sm transition-all duration-300 border cursor-pointer ${
                strategy === "clasic"
                  ? "bg-foreground text-background border-foreground shadow-lg"
                  : "bg-muted text-muted-foreground border-border"
              }`}
            >
              {t.clasic}
            </button>
            <button
              onClick={() => { setStrategy("hotel"); setSimCount(c => c + 1); }}
              className={`flex-1 py-3.5 rounded-full font-bold text-sm transition-all duration-300 border cursor-pointer ${
                strategy === "hotel"
                  ? "bg-amber-500 text-slate-900 border-amber-500 shadow-lg"
                  : "bg-muted text-muted-foreground border-border"
              }`}
            >
              {t.hotel}
            </button>
          </div>
        </div>

        {/* Results */}
        {calc && (
          <>
            {/* Summary Card */}
            <div className="bg-card border border-border rounded-2xl p-5 sm:p-7 shadow-lg overflow-hidden">
              <h3 className="text-amber-500 font-bold text-lg md:text-xl mt-0 mb-4">{displayTitle}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t.strategy}: <b className="text-foreground">{strategy === "hotel" ? "ApArt Hotel" : (language === "ro" ? "Clasică" : "Classic")}</b>
                {" | "}{t.yieldNet}: <span className="text-amber-500 text-2xl font-bold">{calc.yieldAnual.toFixed(2)}%</span>
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-muted/50 p-5 rounded-2xl border border-border">
                  <div className="text-sm text-muted-foreground mb-1">{t.totalWealth}:</div>
                  <div className="text-amber-500 text-2xl sm:text-3xl font-bold break-all">
                    {Math.round(calc.avereTotala).toLocaleString()} €
                  </div>
                </div>
                <div className="bg-muted/50 p-5 rounded-2xl border border-border">
                  <div className="text-sm text-muted-foreground mb-1">{t.cashflow}:</div>
                  <div className={`text-2xl sm:text-3xl font-bold ${calc.cashflow > 0 ? "text-emerald-500" : "text-red-500"}`}>
                    {Math.round(calc.cashflow)} €{t.perMonth}
                  </div>
                </div>
              </div>
            </div>

            {/* Top Properties */}
            {!hideRecommendations && rankedProperties.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-5 sm:p-7 shadow-lg overflow-hidden">
                <h3 className="font-bold text-lg mb-4">{t.topProperties}</h3>
                <div className="space-y-3">
                  {rankedProperties.map((p, i) => (
                    <div
                      key={i}
                      className={`p-4 rounded-2xl border transition-all ${
                        i === 0
                          ? "border-l-4 border-l-amber-500 border-border bg-gradient-to-r from-muted/50 to-card"
                          : "border-border bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {i === 0 && <Trophy className="w-5 h-5 text-amber-500 shrink-0" />}
                        <span className="font-bold text-sm sm:text-base break-words min-w-0">{p.name}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                        <div>{t.price}: <b>{p.price.toLocaleString()} €</b></div>
                        <div>
                          {t.yield}: <b className="text-emerald-500">{p.yieldVal.toFixed(2)}%</b>
                          {p.yieldVal >= 6.5 && (
                            <Badge variant="secondary" className="ml-1 text-[9px] bg-amber-500/20 text-amber-500 px-1.5">
                              {t.aboveAvg}
                            </Badge>
                          )}
                        </div>
                        <div>
                          {t.cashflowNet}: <b className={p.netMonthly > 0 ? "text-emerald-500" : "text-red-500"}>
                            {Math.round(p.netMonthly)} €{t.perMonth}
                          </b>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chart */}
            <div className="bg-card border border-border rounded-2xl p-5 sm:p-7 shadow-lg overflow-hidden">
              <h3 className="font-bold text-sm text-center mb-4 text-muted-foreground uppercase tracking-wider">{t.chartTitle}</h3>
              <div className="bg-muted/30 rounded-2xl border border-border p-4">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} barSize={50}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fill: "hsl(var(--foreground))", fontWeight: "bold", fontSize: 12 }} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                      <Cell fill="#2ecc71" />
                      <Cell fill="#f39c12" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Expert Verdict */}
            <div className="bg-amber-50 dark:bg-amber-500/5 border-l-[10px] border-l-amber-500 border border-border rounded-2xl p-6 sm:p-7 relative">
              <div className="text-amber-500 text-[11px] font-bold uppercase tracking-widest mb-2">{t.expertTitle}</div>
              <div
                className="text-foreground leading-7 italic text-sm sm:text-base"
                dangerouslySetInnerHTML={{ __html: verdict }}
              />
              <div className="mt-4 pt-3 border-t border-border/50 text-[13px] text-muted-foreground">
                <strong>{t.expertName}</strong> — {t.expertRole}
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 print:hidden">
              <Button
                onClick={() => window.print()}
                className="flex-1 py-6 bg-muted hover:bg-muted/80 text-foreground font-bold text-base rounded-xl"
              >
                <Download className="w-5 h-5 mr-2" />
                {t.ctaPdf}
              </Button>
              <Button
                onClick={handleWhatsApp}
                className="flex-1 py-6 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-base rounded-xl"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                {t.ctaWhatsApp}
              </Button>
            </div>

            {/* Legal Disclaimer */}
            <div className="border-t border-border pt-5 text-[10px] text-muted-foreground leading-snug text-justify print:block">
              <strong>{t.disclaimer}</strong><br />
              1. {t.disclaimer1}<br />
              2. {t.disclaimer2}<br />
              3. {t.disclaimer3}
            </div>
          </>
        )}
      </div>

      {/* Contact Popup */}
      {showPopup && (
        <div className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 print:hidden">
          <div className="bg-card border-2 border-amber-500 rounded-2xl p-8 text-center max-w-[400px] w-full shadow-2xl relative">
            <button
              onClick={() => setShowPopup(false)}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-5xl mb-4">🚀</div>
            <h3 className="text-xl font-bold mb-2">{t.popupTitle}</h3>
            <p className="text-muted-foreground text-sm mb-6">{t.popupDesc}</p>
            <Button
              onClick={() => { handleWhatsApp(); setShowPopup(false); }}
              className="w-full py-5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-base rounded-xl mb-3"
            >
              {t.popupCta}
            </Button>
            <button
              onClick={() => setShowPopup(false)}
              className="text-muted-foreground text-xs hover:text-foreground cursor-pointer bg-transparent border-none"
            >
              {t.popupDismiss}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default InvestmentEngineV34;
