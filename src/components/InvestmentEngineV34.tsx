import { useState, useMemo, useEffect, useRef } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, CartesianGrid, Tooltip, Area, AreaChart,
} from "recharts";
import { TrendingUp, Download, MessageCircle, Trophy, X, Shield, Percent, DollarSign, CalendarDays } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  propertyName?: string;
  propertyCode?: string | null;
  defaultPrice?: number;
  defaultRent?: number;
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
  defaultPrice,
  defaultRent,
  hideRecommendations = false,
}: Props) => {
  const { language } = useLanguage();
  const [budgetStr, setBudgetStr] = useState(defaultPrice?.toString() ?? "");
  const [chirieStr, setChirieStr] = useState(defaultRent?.toString() ?? "");
  const [advanceStr, setAdvanceStr] = useState("25");
  const [interestStr, setInterestStr] = useState("6.5");
  const [occupancy, setOccupancy] = useState("12");
  const [taxRate, setTaxRate] = useState("0.07");
  const [strategy, setStrategy] = useState<"clasic" | "hotel">("clasic");
  const [clientName, setClientName] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const popupTriggered = useRef(false);
  const [dbProperties, setDbProperties] = useState<DbProperty[]>([]);

  const budget = budgetStr === "" ? NaN : parseFloat(budgetStr);
  const chirie = chirieStr === "" ? NaN : parseFloat(chirieStr);
  const advance = advanceStr === "" ? 0 : parseFloat(advanceStr);
  const interest = interestStr === "" ? 0 : parseFloat(interestStr);

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
    if (isNaN(budget) || budget < 1000 || isNaN(chirie) || chirie < 10) return null;

    const occMonths = parseInt(occupancy);
    const tax = parseFloat(taxRate);

    const chirieEfectiva = strategy === "hotel" ? chirie * 1.65 : chirie;
    const managementFactor = strategy === "hotel" ? 0.28 : 0.05;
    const invTotal = budget * 1.02;

    // Gross & net annual income
    const venitBrutAnual = chirieEfectiva * occMonths;
    const venitDupaManagement = venitBrutAnual * (1 - managementFactor);
    const venitNetAnual = venitDupaManagement * (1 - tax);

    // Credit
    const avansBani = budget * (advance / 100);
    const invInitiala = avansBani + (budget * 0.02); // Down payment + acquisition taxes
    const credit = budget - avansBani;
    const r = (interest / 100) / 12;
    const rata = credit > 0
      ? (r > 0 ? (credit * (r * Math.pow(1 + r, 300)) / (Math.pow(1 + r, 300) - 1)) : (credit / 300))
      : 0;
    const rataAnuala = rata * 12;

    // KPIs
    const yieldAnual = (venitNetAnual / invTotal) * 100;
    const cashflowAnual = venitNetAnual - rataAnuala;
    const cashflowLunar = cashflowAnual / 12;
    const coc = invInitiala > 0 ? (cashflowAnual / invInitiala) * 100 : 0; // Cash-on-Cash
    const safety = rataAnuala > 0 ? ((venitNetAnual / rataAnuala) - 1) * 100 : 100; // Margin of Safety
    const breakEvenRent = rataAnuala > 0 ? Math.round(rataAnuala / 12 / 0.7) : 0;

    // 15-year wealth projection
    const wealthData: { year: string; value: number }[] = [];
    for (let i = 1; i <= 15; i++) {
      const eq = budget * Math.pow(1.04, i);
      const cash = cashflowAnual * i;
      wealthData.push({ year: `${i}`, value: Math.round(eq + cash) });
    }

    // Exit at 10 years
    const val10 = budget * Math.pow(1.04, 10);
    const profitExit10 = (val10 - budget) + (cashflowAnual * 10);

    // Total wealth 15y
    const valViitoare = budget * Math.pow(1.04, 15);
    const avereTotala = valViitoare + (cashflowAnual * 15);

    return {
      chirieEfectiva, rata, venitNetAnual, cashflowLunar, cashflowAnual,
      yieldAnual, coc, safety, breakEvenRent,
      valViitoare, avereTotala, profitExit10, wealthData, invInitiala,
    };
  }, [budget, chirie, advance, interest, strategy, occupancy, taxRate]);

  // Trigger popup 10s after first valid calculation, once only
  useEffect(() => {
    if (calc && !popupTriggered.current) {
      popupTriggered.current = true;
      const timer = setTimeout(() => setShowPopup(true), 10000);
      return () => clearTimeout(timer);
    }
  }, [calc]);

  // Ranked properties from DB
  const rankedProperties = useMemo((): RankedProperty[] => {
    if (hideRecommendations || !dbProperties.length) return [];
    const r = (interest / 100) / 12;
    const managementFactor = strategy === "hotel" ? 0.28 : 0.05;
    const tax = parseFloat(taxRate);
    const occMonths = parseInt(occupancy);

    return dbProperties
      .filter(p => p.capital_necesar && p.capital_necesar > 0 && p.estimated_revenue)
      .map(p => {
        const price = p.capital_necesar!;
        const rent = parseFloat(p.estimated_revenue!.replace(/[^0-9.]/g, "")) || 0;
        if (!rent) return null;
        const ch = strategy === "hotel" ? rent * 1.65 : rent;
        const brut = ch * occMonths;
        const net = brut * (1 - managementFactor) * (1 - tax);
        const creditP = price * (1 - advance / 100);
        const pmt = creditP > 0
          ? (r > 0 ? creditP * (r * Math.pow(1 + r, 300)) / (Math.pow(1 + r, 300) - 1) : creditP / 300)
          : 0;
        const netM = (net / 12) - pmt;
        const yv = (net / (price * 1.02)) * 100;
        return { name: p.name, price, yieldVal: yv, netMonthly: netM };
      })
      .filter(Boolean)
      .sort((a, b) => b!.yieldVal - a!.yieldVal)
      .slice(0, 3) as RankedProperty[];
  }, [dbProperties, advance, interest, strategy, hideRecommendations, occupancy, taxRate]);

  const verdict = useMemo(() => {
    if (!calc) return "";
    const { coc, yieldAnual, safety, cashflowLunar } = calc;
    let msg = "";
    if (coc > 12) {
      msg = language === "ro"
        ? "<b>Strategie Agresivă:</b> Randamentul la capitalul propriu (CoC) este masiv datorită efectului de levier. Această proprietate este o 'mașină de cash'."
        : "<b>Aggressive Strategy:</b> Cash-on-Cash return is massive due to leverage effect. This property is a 'cash machine'.";
    } else if (yieldAnual > 6) {
      msg = language === "ro"
        ? `<b>Investiție Core:</b> Un raport risc-profit ideal. Siguranța de ${safety.toFixed(0)}% oferă liniște în perioade de recesiune.`
        : `<b>Core Investment:</b> An ideal risk-reward ratio. The ${safety.toFixed(0)}% safety margin provides peace during recessions.`;
    } else {
      msg = language === "ro"
        ? "<b>Profil Conservator:</b> Se pretează pentru stocarea capitalului, cu focus pe aprecierea imobiliară pe termen lung."
        : "<b>Conservative Profile:</b> Suited for capital storage, with focus on long-term real estate appreciation.";
    }
    if (cashflowLunar > 0) {
      msg += language === "ro" ? " Proprietatea generează cashflow pozitiv." : " The property generates positive cashflow.";
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
    const propContext = propertyCode ? `[${propertyCode}] ` : "";
    const yieldText = calc ? `Yield: ${calc.yieldAnual.toFixed(2)}%, CoC: ${calc.coc.toFixed(2)}%` : "";
    const msg = language === "ro"
      ? `Bună Adrian! Sunt ${name}. ${propContext}Am analizat oferta RealTrust & ApArt Hotel (${yieldText}) și doresc detalii despre vizionare.`
      : `Hello Adrian! I'm ${name}. ${propContext}I analyzed the RealTrust & ApArt Hotel offer (${yieldText}) and would like viewing details.`;
    window.open(`https://wa.me/40723154520?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const t = language === "ro" ? {
    title: "RealTrust & ApArt Hotel Elite Hub",
    reportPrefix: "Raport Investiție pentru: ",
    analysisTitle: "Analiză de Profitabilitate",
    namePlaceholder: "Introduceți numele dumneavoastră",
    nameLabel: "Nume Investitor (pentru Raport PDF)",
    budget: "💰 Valoare Imobil (€)",
    rent: "🔑 Chirie Estimată (€/lună)",
    advance: "🏦 Avans (%)",
    interest: "📈 Dobândă (%)",
    occupancy: "📅 Ocupare Anuală",
    taxRate: "🏛️ Regim Fiscal",
    budgetPlaceholder: "Ex: 120000",
    rentPlaceholder: "Ex: 550",
    advancePlaceholder: "25",
    interestPlaceholder: "6.5",
    occ12: "12 Luni (Full)",
    occ11: "11 Luni",
    occ10: "10 Luni",
    occ9: "9 Luni",
    tax7: "7% (Forfetar)",
    tax10: "10% (Real)",
    clasic: "Închiriere Clasică",
    hotel: "Regim Hotelier (ApArt Hotel)",
    strategy: "Strategie",
    yieldNet: "Yield Net Anual",
    cocReturn: "Cash-on-Cash Return",
    marginSafety: "Margin of Safety",
    totalWealth: "Avere Totală în 15 ani",
    cashflow: "Cashflow Lunar Net",
    breakEven: "Break-even",
    breakEvenMsg: "min. {val} € chirie/lună",
    exitProfit: "Profit Net la Revânzare (10 ani)",
    wealthChart: "Evoluție Avere 15 Ani (Cash + Equity)",
    breakEvenCard: "Break-Even & Cashflow",
    topProperties: "Top Proprietăți Recomandate",
    chartTitle: "Comparație: Imobiliare vs Bancă",
    topYield: "TOP Randament",
    price: "Preț",
    yield: "Randament",
    cashflowNet: "Cashflow Net",
    perMonth: "/lună",
    expertTitle: "Analiză Adrian Costi",
    expertName: "Adrian Costi",
    expertRole: "Investment Specialist Timișoara",
    ctaPdf: "📄 Descarcă PDF Analiză",
    ctaWhatsApp: "💬 Rezervă Consultanță Adrian",
    disclaimer: "NOTĂ JURIDICĂ ȘI CLAUZĂ DE NERESPONSABILITATE:",
    disclaimer1: "Prezenta simulare reprezintă o analiză matematică bazată pe indicatori statistici și nu constituie o ofertă fermă sau o garanție de profit din partea RealTrust & ApArt Hotel.",
    disclaimer2: "Calculele privind creditarea sunt estimative. Ratele și dobânzile (IRCC/ROBOR) depind exclusiv de politicile băncilor comerciale și de profilul de risc al clientului.",
    disclaimer3: "Performanța în regim hotelier este direct influențată de sezonalitate și presupune un management profesional conform standardelor ApArt Hotel.",
    popupTitle: "Analiză Premium",
    popupDesc: "Indicatorii tăi sunt peste media pieței. Vrei să vezi lista secretă cu unitățile care ating aceste cifre?",
    popupCta: "VREAU LISTA",
    popupDismiss: "Mai analizez",
  } : {
    title: "RealTrust & ApArt Hotel Elite Hub",
    reportPrefix: "Investment Report for: ",
    analysisTitle: "Profitability Analysis",
    namePlaceholder: "Enter your name",
    nameLabel: "Investor Name (for PDF Report)",
    budget: "💰 Property Value (€)",
    rent: "🔑 Estimated Rent (€/month)",
    advance: "🏦 Down Payment (%)",
    interest: "📈 Interest Rate (%)",
    occupancy: "📅 Annual Occupancy",
    taxRate: "🏛️ Tax Regime",
    budgetPlaceholder: "e.g. 120000",
    rentPlaceholder: "e.g. 550",
    advancePlaceholder: "25",
    interestPlaceholder: "6.5",
    occ12: "12 Months (Full)",
    occ11: "11 Months",
    occ10: "10 Months",
    occ9: "9 Months",
    tax7: "7% (Flat Rate)",
    tax10: "10% (Standard)",
    clasic: "Classic Rental",
    hotel: "Hotel Strategy (ApArt Hotel)",
    strategy: "Strategy",
    yieldNet: "Net Annual Yield",
    cocReturn: "Cash-on-Cash Return",
    marginSafety: "Margin of Safety",
    totalWealth: "Total Wealth in 15 yrs",
    cashflow: "Monthly Net Cashflow",
    breakEven: "Break-even",
    breakEvenMsg: "min. {val} € rent/month",
    exitProfit: "Net Profit at Resale (10 yrs)",
    wealthChart: "Wealth Evolution 15 Years (Cash + Equity)",
    breakEvenCard: "Break-Even & Cashflow",
    topProperties: "Top Recommended Properties",
    chartTitle: "Comparison: Real Estate vs Bank",
    topYield: "TOP Yield",
    price: "Price",
    yield: "Yield",
    cashflowNet: "Net Cashflow",
    perMonth: "/mo",
    expertTitle: "Adrian Costi Analysis",
    expertName: "Adrian Costi",
    expertRole: "Investment Specialist Timișoara",
    ctaPdf: "📄 Download PDF Analysis",
    ctaWhatsApp: "💬 Book Adrian Consultation",
    disclaimer: "LEGAL NOTICE AND DISCLAIMER:",
    disclaimer1: "This simulation represents a mathematical analysis based on statistical indicators and does not constitute a firm offer or profit guarantee from RealTrust & ApArt Hotel.",
    disclaimer2: "Credit calculations are estimates. Rates and interest depend exclusively on commercial bank policies and the client's risk profile.",
    disclaimer3: "Performance in hotel mode is directly influenced by seasonality and requires professional management per ApArt Hotel standards.",
    popupTitle: "Premium Analysis",
    popupDesc: "Your indicators are above market average. Want to see the exclusive list of units that reach these numbers?",
    popupCta: "I WANT THE LIST",
    popupDismiss: "I'll analyze more",
  };

  const displayTitle = clientName ? `${t.reportPrefix}${clientName}` : t.analysisTitle;

  const yieldColor = (val: number) => {
    if (val >= 7.5) return "text-emerald-500";
    if (val >= 5.5) return "text-amber-500";
    return "text-red-500";
  };

  return (
    <>
      <div className="max-w-[1100px] mx-auto my-8 space-y-6 print:space-y-4">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-foreground to-amber-500 bg-clip-text text-transparent inline-block">
            {t.title}
          </h2>
        </div>

        {/* Client Name Card */}
        <div className="bg-card border border-border rounded-3xl p-6 text-center shadow-xl print:hidden">
          <Label className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
            {t.nameLabel}
          </Label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder={t.namePlaceholder}
            className="mt-2 px-4 py-3 w-full max-w-[400px] bg-background border border-border rounded-xl text-center text-sm text-foreground outline-none focus:ring-2 focus:ring-amber-500 mx-auto block transition-all"
          />
        </div>

        {/* Inputs Card */}
        <div className="bg-card border border-border rounded-3xl p-5 sm:p-7 shadow-xl print:hidden">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <Label className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">{t.budget}</Label>
              <Input
                type="number"
                value={budgetStr}
                onChange={(e) => setBudgetStr(e.target.value)}
                onFocus={(e) => e.target.select()}
                placeholder={t.budgetPlaceholder}
                className="mt-1 text-base font-bold"
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">{t.rent}</Label>
              <Input
                type="number"
                value={chirieStr}
                onChange={(e) => setChirieStr(e.target.value)}
                onFocus={(e) => e.target.select()}
                placeholder={t.rentPlaceholder}
                className="mt-1 text-base font-bold"
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">{t.occupancy}</Label>
              <Select value={occupancy} onValueChange={setOccupancy}>
                <SelectTrigger className="mt-1 text-base font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12">{t.occ12}</SelectItem>
                  <SelectItem value="11">{t.occ11}</SelectItem>
                  <SelectItem value="10">{t.occ10}</SelectItem>
                  <SelectItem value="9">{t.occ9}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <Label className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">{t.advance}</Label>
              <Input
                type="number"
                value={advanceStr}
                onChange={(e) => setAdvanceStr(e.target.value)}
                onFocus={(e) => e.target.select()}
                placeholder={t.advancePlaceholder}
                className="mt-1 text-base font-bold"
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">{t.interest}</Label>
              <Input
                type="number"
                value={interestStr}
                onChange={(e) => setInterestStr(e.target.value)}
                onFocus={(e) => e.target.select()}
                placeholder={t.interestPlaceholder}
                className="mt-1 text-base font-bold"
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">{t.taxRate}</Label>
              <Select value={taxRate} onValueChange={setTaxRate}>
                <SelectTrigger className="mt-1 text-base font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.07">{t.tax7}</SelectItem>
                  <SelectItem value="0.10">{t.tax10}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Strategy Buttons */}
          <div className="flex gap-3 mt-2">
            <button
              onClick={() => setStrategy("clasic")}
              className={`flex-1 py-3.5 rounded-full font-bold text-sm transition-all duration-300 border cursor-pointer ${
                strategy === "clasic"
                  ? "bg-foreground text-background border-foreground shadow-lg"
                  : "bg-muted text-muted-foreground border-border"
              }`}
            >
              {t.clasic}
            </button>
            <button
              onClick={() => setStrategy("hotel")}
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
            {/* KPI Stat Boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center p-5 rounded-2xl bg-card border border-border shadow-lg">
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-2 flex items-center justify-center gap-1.5">
                  <Percent className="w-3.5 h-3.5" />
                  {t.yieldNet}
                </div>
                <div className={`text-3xl font-extrabold ${yieldColor(calc.yieldAnual)}`}>
                  {calc.yieldAnual.toFixed(2)}%
                </div>
              </div>
              <div className="text-center p-5 rounded-2xl bg-card border border-border shadow-lg">
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-2 flex items-center justify-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5" />
                  {t.cocReturn}
                </div>
                <div className="text-3xl font-extrabold text-emerald-500">
                  {calc.coc.toFixed(2)}%
                </div>
              </div>
              <div className="text-center p-5 rounded-2xl bg-card border border-border shadow-lg">
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-2 flex items-center justify-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  {t.marginSafety}
                </div>
                <div className={`text-3xl font-extrabold ${calc.safety > 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {calc.safety > 0 ? "+" : ""}{calc.safety.toFixed(0)}%
                </div>
              </div>
            </div>

            {/* Wealth Chart + Cashflow Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 bg-card border border-border rounded-3xl p-5 sm:p-7 shadow-xl overflow-hidden">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-3 block">
                  {t.wealthChart}
                </Label>
                <div className="bg-muted/30 rounded-2xl border border-border p-3">
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={calc.wealthData}>
                      <defs>
                        <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#d4af37" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#d4af37" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="year" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", color: "hsl(var(--foreground))" }}
                        formatter={(value: number) => [`${value.toLocaleString()} €`, language === "ro" ? "Avere Totală" : "Total Wealth"]}
                        labelFormatter={(label) => `${language === "ro" ? "Anul" : "Year"} ${label}`}
                      />
                      <Area type="monotone" dataKey="value" stroke="#d4af37" strokeWidth={3} fill="url(#goldGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-card border border-border rounded-3xl p-5 sm:p-7 shadow-xl overflow-hidden flex flex-col justify-between">
                <div>
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-3 block">
                    {t.breakEvenCard}
                  </Label>
                  <div className={`text-3xl font-extrabold my-2 ${calc.cashflowLunar > 0 ? "text-emerald-500" : "text-red-500"}`}>
                    {Math.round(calc.cashflowLunar)} €{t.perMonth}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t.breakEven}: {t.breakEvenMsg.replace("{val}", String(calc.breakEvenRent))}
                  </p>
                </div>
                <div className="mt-5 pt-4 border-t border-border">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1 block">
                    {t.exitProfit}
                  </Label>
                  <div className="text-xl font-bold text-emerald-500">
                    + {Math.round(calc.profitExit10).toLocaleString()} €
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Card */}
            <div className="bg-card border border-border rounded-3xl p-5 sm:p-7 shadow-xl overflow-hidden">
              <h3 className="text-amber-500 font-bold text-lg md:text-xl mt-0 mb-4">{displayTitle}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-muted/50 p-5 rounded-2xl border border-border">
                  <div className="text-sm text-muted-foreground mb-1">{t.totalWealth}:</div>
                  <div className="text-amber-500 text-2xl sm:text-3xl font-extrabold break-all">
                    {Math.round(calc.avereTotala).toLocaleString()} €
                  </div>
                </div>
                <div className="bg-muted/50 p-5 rounded-2xl border border-border">
                  <div className="text-sm text-muted-foreground mb-1">{t.cashflow}:</div>
                  <div className={`text-2xl sm:text-3xl font-extrabold ${calc.cashflowLunar > 0 ? "text-emerald-500" : "text-red-500"}`}>
                    {Math.round(calc.cashflowLunar)} €{t.perMonth}
                  </div>
                </div>
              </div>
            </div>

            {/* Top Properties */}
            {!hideRecommendations && rankedProperties.length > 0 && (
              <div className="bg-card border border-border rounded-3xl p-5 sm:p-7 shadow-xl overflow-hidden">
                <h3 className="font-bold text-lg mb-4">{t.topProperties}</h3>
                <div className="space-y-3">
                  {rankedProperties.map((p, i) => (
                    <div
                      key={i}
                      className={`p-4 rounded-2xl border transition-all ${
                        i === 0
                          ? "border-2 border-amber-500 bg-gradient-to-r from-muted/50 to-card"
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
                              {t.topYield}
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

            {/* Bar Chart comparison */}
            <div className="bg-card border border-border rounded-3xl p-5 sm:p-7 shadow-xl overflow-hidden">
              <h3 className="font-bold text-sm text-center mb-4 text-muted-foreground uppercase tracking-widest">{t.chartTitle}</h3>
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
            <div className="bg-amber-50 dark:bg-amber-500/5 border-l-[10px] border-l-amber-500 border border-border rounded-3xl p-6 sm:p-7 relative">
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
          <div className="bg-card border-2 border-amber-500 rounded-3xl p-8 text-center max-w-[400px] w-full shadow-2xl relative">
            <button
              onClick={() => setShowPopup(false)}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-5xl mb-4">💎</div>
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
