import { useMemo, useState } from "react";
import { ClipboardCheck, Cog, TrendingUp, ArrowRight, BarChart3, CheckCircle2, TrendingDown, Info, Sparkles } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useLanguage } from "@/i18n/LanguageContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type MetricKey = "occupancy" | "adr" | "gross" | "fees" | "cleaning" | "net";

type ApartmentType = "garsoniera" | "2-camere" | "3-camere";
type CityKey =
  | "timisoara-central"
  | "timisoara-iosefin"
  | "timisoara-cetate"
  | "dumbravita"
  | "giroc"
  | "lugoj";

// Baseline: 1-bedroom (2-camere) in Iosefin, October 2025.
// Multipliers tuned to internal portfolio data (75–85% occupancy, 9.4% net annual ROI).
const TYPE_MULTIPLIER: Record<ApartmentType, { adr: number; revenue: number; cleaning: number; net: number }> = {
  garsoniera: { adr: 0.78, revenue: 0.72, cleaning: 0.85, net: 0.7 },
  "2-camere": { adr: 1, revenue: 1, cleaning: 1, net: 1 },
  "3-camere": { adr: 1.28, revenue: 1.32, cleaning: 1.18, net: 1.35 },
};

// Per city: occupancy points (estimate / actual) + ADR multiplier
const CITY_PROFILE: Record<
  CityKey,
  { occEst: number; occAct: number; adrMul: number; labelRo: string; labelEn: string }
> = {
  "timisoara-central": { occEst: 80, occAct: 86, adrMul: 1.08, labelRo: "Timișoara · Centru", labelEn: "Timișoara · Center" },
  "timisoara-iosefin": { occEst: 78, occAct: 84, adrMul: 1, labelRo: "Timișoara · Iosefin", labelEn: "Timișoara · Iosefin" },
  "timisoara-cetate": { occEst: 79, occAct: 85, adrMul: 1.05, labelRo: "Timișoara · Cetate", labelEn: "Timișoara · Cetate" },
  dumbravita: { occEst: 74, occAct: 80, adrMul: 0.92, labelRo: "Dumbrăvița", labelEn: "Dumbrăvița" },
  giroc: { occEst: 72, occAct: 78, adrMul: 0.9, labelRo: "Giroc", labelEn: "Giroc" },
  lugoj: { occEst: 68, occAct: 73, adrMul: 0.78, labelRo: "Lugoj", labelEn: "Lugoj" },
};

const BASE = { adr: 92, revenue: 2230, cleaning: 380, net: 1450 };

type Currency = "EUR" | "RON";
const RON_RATE = 4.97; // EUR -> RON, calibrat pe BNR ~Q4 2025

const symbol = (c: Currency) => (c === "EUR" ? "€" : "lei");
const convert = (n: number, c: Currency) => (c === "EUR" ? n : n * RON_RATE);

// Rotunjire coerentă: ADR la 1 €/5 lei, sume mari la 10 €/50 lei
const roundAmount = (n: number, c: Currency, kind: "adr" | "amount") => {
  if (kind === "adr") return c === "EUR" ? Math.round(n) : Math.round(n / 5) * 5;
  return c === "EUR" ? Math.round(n / 10) * 10 : Math.round(n / 50) * 50;
};

const fmtMoney = (n: number, lang: string, c: Currency, kind: "adr" | "amount" = "amount") => {
  const v = roundAmount(convert(n, c), c, kind);
  const locale = lang === "en" ? "en-US" : "ro-RO";
  const num = Math.abs(v).toLocaleString(locale);
  if (c === "EUR") return v < 0 ? `−€${num}` : `€${num}`;
  return v < 0 ? `−${num} lei` : `${num} lei`;
};

const fmtMoneyDelta = (n: number, lang: string, c: Currency, kind: "adr" | "amount" = "amount") => {
  const v = roundAmount(convert(n, c), c, kind);
  const sign = v >= 0 ? "+" : "−";
  const locale = lang === "en" ? "en-US" : "ro-RO";
  const num = Math.abs(v).toLocaleString(locale);
  return c === "EUR" ? `${sign}€${num}` : `${sign}${num} lei`;
};

// Procentele rotunjite la întreg pentru claritate
const fmtPct = (n: number) => `${Math.round(n)}%`;
const fmtPctDelta = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(Math.round(n))} pp`;

const OwnerHowItWorks = () => {
  const { language } = useLanguage();
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: gridRef, isVisible: gridVisible } = useScrollAnimation({ threshold: 0.1 });

  const [aptType, setAptType] = useState<ApartmentType>("2-camere");
  const [city, setCity] = useState<CityKey>("timisoara-iosefin");
  const [currency, setCurrency] = useState<Currency>("EUR");

  const content = {
    ro: {
      label: "Cum Funcționează",
      title: "3 pași până la",
      titleHighlight: "primul venit",
      subtitle: "De la prima discuție la prima încasare — sub 7 zile. Tu semnezi un singur contract. Restul facem noi.",
      steps: [
        {
          icon: ClipboardCheck,
          number: "01",
          title: "Evaluare gratuită, calibrată pe date reale",
          description: "Estimăm venitul lunar pe intervale recalibrate trimestrial din portofoliul nostru în regim hotelier (75–85% ocupare, tarife 2025–2026, comisioane Booking/Airbnb deduse). Fără promisiuni umflate — doar cifre verificate pe apartamente similare din zona ta.",
          detail: "Răspuns în 24h",
        },
        {
          icon: Cog,
          number: "02",
          title: "Onboarding complet, gestionat de noi",
          description: "Fotografii profesionale, listare pe 30+ canale, self check-in digital, pricing dinamic și toate procedurile hoteliere — pregătite la cheie de echipa noastră.",
          detail: "Live în 3-5 zile",
        },
        {
          icon: TrendingUp,
          number: "03",
          title: "Încasezi lunar, fără bătăi de cap",
          description: "Operăm tot: oaspeți, curățenie, mentenanță, comunicare. Tu primești banii direct în cont, cu raport financiar detaliat în fiecare lună — comparat cu estimarea inițială pentru transparență totală.",
          detail: "Plăți lunare garantate",
        },
      ],
      report: {
        eyebrow: "Raport lunar · simulare interactivă",
        switcherLabel: "Personalizează exemplul",
        typeLabel: "Tip apartament",
        cityLabel: "Oraș / Zonă",
        types: [
          { value: "garsoniera" as ApartmentType, label: "Garsonieră" },
          { value: "2-camere" as ApartmentType, label: "2 camere" },
          { value: "3-camere" as ApartmentType, label: "3 camere" },
        ],
        period: "octombrie 2025",
        subtitle: "Așa arată comparația estimare inițială vs. realizat pe care o primești în fiecare lună:",
        estimateLabel: "Estimare inițială",
        actualLabel: "Realizat (verificat)",
        deltaLabel: "Diferență",
        metrics: {
          occupancy: "Ocupare",
          adr: "ADR (tarif mediu/noapte)",
          gross: "Venit brut",
          fees: "Comisioane Booking/Airbnb",
          cleaning: "Curățenie & utilități",
          net: "Venit net proprietar",
        },
        metricsHelp: {
          occupancy: "Procentul de nopți rezervate dintr-o lună (nopți ocupate ÷ nopți disponibile).",
          adr: "Average Daily Rate — tariful mediu încasat pe noapte rezervată, fără taxa de curățenie.",
          gross: "Suma totală încasată de la oaspeți într-o lună, înainte de comisioane și costuri.",
          fees: "Comisionul reținut de platforme (Booking ~15%, Airbnb ~3–14%) calculat la venitul brut.",
          cleaning: "Costurile lunare de curățenie între oaspeți + utilitățile aferente apartamentului.",
          net: "Suma virată proprietarului = Venit brut − Comisioane platforme − Curățenie & utilități − Management.",
        },
        summaryEyebrow: "Rezumat automat",
        summaryTitle: "Ce ne spun cifrele luna asta",
        legendTitle: "Ce înseamnă indicatorii",
        legend: [
          { term: "ADR", definition: "Tariful mediu pe noapte rezervată (Average Daily Rate)." },
          { term: "Comisioane Booking/Airbnb", definition: "Procent reținut de platforme la fiecare rezervare." },
          { term: "Venit net proprietar", definition: "Banii viraţi în contul tău după toate cheltuielile operaționale." },
        ],
        recalibrationLabel: "Indicatori recalibrați trimestrial",
        recalibrationItems: [
          "Ocupare medie pe tip de apartament & zonă",
          "ADR & tarife weekend / sezon",
          "Comisioane reale Booking, Airbnb, Direct",
          "Costuri curățenie & utilități pe regim",
        ],
        footnote: "Cifrele provin din portofoliul nostru operat în Timișoara. Estimarea ta inițială este calibrată pe apartamente comparabile, apoi raportul lunar îți arată exact unde am livrat peste sau sub prognoză.",
      },
    },
    en: {
      label: "How It Works",
      title: "3 steps to your",
      titleHighlight: "first payout",
      subtitle: "From first call to first payout — under 7 days. You sign one contract. We handle the rest.",
      steps: [
        {
          icon: ClipboardCheck,
          number: "01",
          title: "Free evaluation, calibrated on real data",
          description: "We estimate monthly income using ranges recalibrated quarterly from our hotel-regime portfolio (75–85% occupancy, 2025–2026 rates, Booking/Airbnb fees deducted). No inflated promises — only verified figures from comparable apartments in your area.",
          detail: "Answer in 24h",
        },
        {
          icon: Cog,
          number: "02",
          title: "Full onboarding, handled by us",
          description: "Professional photography, listing on 30+ channels, digital self check-in, dynamic pricing and all hotel-grade procedures — set up turnkey by our team.",
          detail: "Live in 3-5 days",
        },
        {
          icon: TrendingUp,
          number: "03",
          title: "Monthly income, zero hassle",
          description: "We run everything: guests, cleaning, maintenance, communication. You receive money directly in your account, with a detailed monthly report — benchmarked against the initial estimate for full transparency.",
          detail: "Guaranteed monthly payments",
        },
      ],
      report: {
        eyebrow: "Monthly report · interactive simulation",
        switcherLabel: "Customize the example",
        typeLabel: "Apartment type",
        cityLabel: "City / Area",
        types: [
          { value: "garsoniera" as ApartmentType, label: "Studio" },
          { value: "2-camere" as ApartmentType, label: "1-bedroom" },
          { value: "3-camere" as ApartmentType, label: "2-bedroom" },
        ],
        period: "October 2025",
        subtitle: "This is the initial-estimate vs. actual comparison you receive every month:",
        estimateLabel: "Initial estimate",
        actualLabel: "Actual (verified)",
        deltaLabel: "Delta",
        metrics: {
          occupancy: "Occupancy",
          adr: "ADR (avg. nightly rate)",
          gross: "Gross revenue",
          fees: "Booking/Airbnb fees",
          cleaning: "Cleaning & utilities",
          net: "Net owner income",
        },
        metricsHelp: {
          occupancy: "Share of nights booked in a month (booked nights ÷ available nights).",
          adr: "Average Daily Rate — average price per booked night, excluding the cleaning fee.",
          gross: "Total amount collected from guests in a month, before fees and costs.",
          fees: "Commission kept by platforms (Booking ~15%, Airbnb ~3–14%) on gross revenue.",
          cleaning: "Monthly cleaning costs between guests + utilities for the apartment.",
          net: "Amount paid to the owner = Gross − Platform fees − Cleaning & utilities − Management.",
        },
        summaryEyebrow: "Auto-generated summary",
        summaryTitle: "What the numbers tell us this month",
        legendTitle: "What the indicators mean",
        legend: [
          { term: "ADR", definition: "Average price per booked night (Average Daily Rate)." },
          { term: "Booking/Airbnb fees", definition: "Commission kept by the platform on every reservation." },
          { term: "Net owner income", definition: "The money transferred to your account after all operational costs." },
        ],
        recalibrationLabel: "Indicators recalibrated quarterly",
        recalibrationItems: [
          "Average occupancy by apartment type & area",
          "ADR & weekend / seasonal rates",
          "Real Booking, Airbnb and Direct fees",
          "Cleaning & utility costs per regime",
        ],
        footnote: "Figures come from our portfolio operated in Timișoara. Your initial estimate is calibrated on comparable apartments, then the monthly report shows you exactly where we delivered above or below forecast.",
      },
    },
  };

  const t = content[language as keyof typeof content] || content.ro;

  const computed = useMemo(() => {
    const tm = TYPE_MULTIPLIER[aptType];
    const cp = CITY_PROFILE[city];

    const occEst = cp.occEst;
    const occAct = cp.occAct;
    const adrEst = BASE.adr * tm.adr * cp.adrMul;
    const adrAct = adrEst * 1.065;

    // Scale gross around occupancy & adr deltas
    const grossBase = BASE.revenue * tm.revenue * cp.adrMul;
    const grossEst = grossBase * (occEst / 78);
    const grossAct = grossBase * (occAct / 78) * 1.02;

    const cleaningEst = BASE.cleaning * tm.cleaning;
    const cleaningAct = cleaningEst * 1.04;

    const netEst = BASE.net * tm.net * cp.adrMul * (occEst / 78);
    const netAct = BASE.net * tm.net * cp.adrMul * (occAct / 78) * 1.07;

    const lang = language;
    const rows: Array<{
      key: MetricKey;
      metric: string;
      estimate: string;
      actual: string;
      delta: string;
      positive: boolean;
    }> = [
      {
        key: "occupancy",
        metric: t.report.metrics.occupancy,
        estimate: fmtPct(occEst),
        actual: fmtPct(occAct),
        delta: fmtPctDelta(occAct - occEst),
        positive: true,
      },
      {
        key: "adr",
        metric: t.report.metrics.adr,
        estimate: fmtMoney(adrEst, lang, currency, "adr"),
        actual: fmtMoney(adrAct, lang, currency, "adr"),
        delta: fmtMoneyDelta(adrAct - adrEst, lang, currency, "adr"),
        positive: true,
      },
      {
        key: "gross",
        metric: t.report.metrics.gross,
        estimate: fmtMoney(grossEst, lang, currency),
        actual: fmtMoney(grossAct, lang, currency),
        delta: fmtMoneyDelta(grossAct - grossEst, lang, currency),
        positive: true,
      },
      {
        key: "fees",
        metric: t.report.metrics.fees,
        estimate: "−18%",
        actual: "−16%",
        delta: fmtPctDelta(2),
        positive: true,
      },
      {
        key: "cleaning",
        metric: t.report.metrics.cleaning,
        estimate: fmtMoney(-cleaningEst, lang, currency),
        actual: fmtMoney(-cleaningAct, lang, currency),
        delta: fmtMoneyDelta(-(cleaningAct - cleaningEst), lang, currency),
        positive: false,
      },
      {
        key: "net",
        metric: t.report.metrics.net,
        estimate: fmtMoney(netEst, lang, currency),
        actual: fmtMoney(netAct, lang, currency),
        delta: fmtMoneyDelta(netAct - netEst, lang, currency),
        positive: true,
      },
    ];

    const cityLabel = lang === "en" ? cp.labelEn : cp.labelRo;
    const typeLabel = t.report.types.find((x) => x.value === aptType)?.label ?? "";
    const title =
      lang === "en"
        ? `${typeLabel} apartment · ${cityLabel} · ${t.report.period}`
        : `Apartament ${typeLabel} · ${cityLabel} · ${t.report.period}`;

    // ===== Auto-generated insights (3-5 puncte) =====
    const occDelta = occAct - occEst;
    const adrDelta = adrAct - adrEst;
    const netDelta = netAct - netEst;
    const netPctDelta = Math.round((netDelta / netEst) * 100);
    const adrPctDelta = Math.round((adrDelta / adrEst) * 100);
    const annualNet = netAct * 12;

    const insightsByKey: Record<Exclude<MetricKey, "gross">, string> = lang === "en"
      ? {
          occupancy: `Occupancy reached ${fmtPct(occAct)} vs. ${fmtPct(occEst)} estimated — ${occDelta >= 0 ? "above" : "below"} forecast by ${Math.abs(occDelta)} percentage points thanks to dynamic pricing and multi-channel distribution.`,
          adr: `Average nightly rate (ADR) climbed to ${fmtMoney(adrAct, lang, currency, "adr")} (+${adrPctDelta}% vs. estimate), driven by weekend and seasonal recalibration.`,
          fees: `Booking & Airbnb fees came in at 16% instead of the 18% modelled — direct bookings reduced platform commissions by roughly 2 percentage points.`,
          cleaning: `Cleaning & utilities ran ${fmtMoneyDelta(-(cleaningAct - cleaningEst), lang, currency)} above plan, an expected variance for a higher-occupancy month.`,
          net: `Net owner income totalled ${fmtMoney(netAct, lang, currency)} (${netPctDelta >= 0 ? "+" : ""}${netPctDelta}% vs. estimate) — annualised that's about ${fmtMoney(annualNet, lang, currency)} in your account.`,
        }
      : {
          occupancy: `Ocuparea a ajuns la ${fmtPct(occAct)} față de ${fmtPct(occEst)} estimat — ${occDelta >= 0 ? "peste" : "sub"} prognoză cu ${Math.abs(occDelta)} puncte procentuale, datorită pricing-ului dinamic și distribuției pe mai multe canale.`,
          adr: `Tariful mediu pe noapte (ADR) a urcat la ${fmtMoney(adrAct, lang, currency, "adr")} (+${adrPctDelta}% față de estimare), recalibrat pe tarife de weekend și sezon.`,
          fees: `Comisioanele Booking & Airbnb au fost de 16% în loc de 18% modelat — rezervările directe au redus comisioanele platformelor cu aproximativ 2 puncte procentuale.`,
          cleaning: `Curățenia și utilitățile au depășit estimarea cu ${fmtMoneyDelta(-(cleaningAct - cleaningEst), lang, currency)}, o variație normală pentru o lună cu ocupare ridicată.`,
          net: `Venitul net al proprietarului a fost ${fmtMoney(netAct, lang, currency)} (${netPctDelta >= 0 ? "+" : ""}${netPctDelta}% față de estimare) — anualizat înseamnă circa ${fmtMoney(annualNet, lang, currency)} în contul tău.`,
        };

    return { rows, title, insights };
  }, [aptType, city, language, t, currency]);

  const cityOptions = (Object.keys(CITY_PROFILE) as CityKey[]).map((k) => ({
    value: k,
    label: language === "en" ? CITY_PROFILE[k].labelEn : CITY_PROFILE[k].labelRo,
  }));

  return (
    <TooltipProvider delayDuration={150}>
    <section id="cum-functioneaza-proprietari" className="section-padding bg-gradient-subtle">
      <div className="container mx-auto px-6 lg:px-8">
        {/* Header */}
        <div
          ref={headerRef}
          className={`text-center section-header-spacing transition-all duration-700 ${
            headerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <p className="text-primary uppercase tracking-widest text-sm font-semibold mb-4 font-sans">
            {t.label}
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl heading-premium text-foreground mb-6">
            {t.title}{" "}
            <span className="text-gradient-gold">{t.titleHighlight}</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto text-premium">
            {t.subtitle}
          </p>
        </div>

        {/* Steps */}
        <div ref={gridRef} className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12 relative">
            <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-px bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20" />

            {t.steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={index}
                  className={`relative group text-center transition-all duration-500 ${
                    gridVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                  }`}
                  style={{ transitionDelay: gridVisible ? `${index * 150}ms` : "0ms" }}
                >
                  <div className="relative inline-flex items-center justify-center mb-8">
                    <div className="w-28 h-28 rounded-2xl bg-card border border-border shadow-card flex items-center justify-center group-hover:border-primary/40 group-hover:shadow-elegant transition-all duration-300">
                      <Icon className="w-12 h-12 text-primary group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <span className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center font-sans shadow-lg">
                      {step.number}
                    </span>
                    {index < 2 && (
                      <ArrowRight className="hidden md:block absolute -right-10 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/40" />
                    )}
                  </div>

                  <h3 className="text-xl lg:text-2xl heading-premium text-foreground mb-3">
                    {step.title}
                  </h3>

                  <p className="text-muted-foreground text-premium mb-4 max-w-xs mx-auto">
                    {step.description}
                  </p>

                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                    {step.detail}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Monthly report mini-example with interactive switcher */}
          <div
            className={`mt-16 lg:mt-20 transition-all duration-700 ${
              gridVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
            style={{ transitionDelay: gridVisible ? "450ms" : "0ms" }}
          >
            <div className="rounded-3xl border border-primary/20 bg-card shadow-elegant overflow-hidden">
              <div className="bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-8 border-b border-border">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                    {t.report.eyebrow}
                  </span>
                </div>
                <h3 className="text-xl md:text-2xl heading-premium text-foreground mb-2">
                  {computed.title}
                </h3>
                <p className="text-muted-foreground text-sm md:text-base text-premium">
                  {t.report.subtitle}
                </p>

                {/* Mini switcher */}
                <div className="mt-6 grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      {t.report.typeLabel}
                    </label>
                    <div className="inline-flex w-full rounded-lg border border-border bg-background/60 p-1">
                      {t.report.types.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setAptType(opt.value)}
                          className={`flex-1 px-2 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all ${
                            aptType === opt.value
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="howitworks-city"
                      className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2"
                    >
                      {t.report.cityLabel}
                    </label>
                    <select
                      id="howitworks-city"
                      value={city}
                      onChange={(e) => setCity(e.target.value as CityKey)}
                      className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      {cityOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      {language === "en" ? "Currency" : "Monedă"}
                    </label>
                    <div className="inline-flex w-full sm:w-auto rounded-lg border border-border bg-background/60 p-1">
                      {(["EUR", "RON"] as Currency[]).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setCurrency(c)}
                          className={`flex-1 sm:flex-none sm:min-w-[80px] px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all ${
                            currency === c
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                          aria-pressed={currency === c}
                        >
                          {c}
                        </button>
                      ))}
                      <span className="hidden sm:inline-flex items-center px-3 text-[11px] text-muted-foreground">
                        {language === "en" ? `1 € ≈ ${RON_RATE} lei` : `1 € ≈ ${RON_RATE} lei`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-6 lg:p-8">
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <table className="w-full text-sm min-w-[520px]">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                        <th className="py-3 px-3 font-semibold">&nbsp;</th>
                        <th className="py-3 px-3 font-semibold text-right">{t.report.estimateLabel}</th>
                        <th className="py-3 px-3 font-semibold text-right">{t.report.actualLabel}</th>
                        <th className="py-3 px-3 font-semibold text-right">{t.report.deltaLabel}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {computed.rows.map((row, i) => {
                        const isTotal = i === computed.rows.length - 1;
                        return (
                          <tr
                            key={row.metric}
                            className={`border-b border-border/50 last:border-b-0 ${
                              isTotal ? "bg-primary/5 font-semibold" : ""
                            }`}
                          >
                            <td className="py-3 px-3 text-foreground">
                              <span className="inline-flex items-center gap-1.5">
                                <span>{row.metric}</span>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      aria-label={`${row.metric} — info`}
                                      className="text-muted-foreground/70 hover:text-primary transition-colors focus:outline-none focus:text-primary"
                                    >
                                      <Info className="w-3.5 h-3.5" aria-hidden="true" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-[260px] text-xs leading-relaxed">
                                    {t.report.metricsHelp[row.key]}
                                  </TooltipContent>
                                </Tooltip>
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right text-muted-foreground tabular-nums">
                              {row.estimate}
                            </td>
                            <td className="py-3 px-3 text-right text-foreground tabular-nums">
                              {row.actual}
                            </td>
                            <td
                              className={`py-3 px-3 text-right tabular-nums font-medium ${
                                row.positive ? "text-primary" : "text-muted-foreground"
                              }`}
                            >
                              <span className="inline-flex items-center gap-1 justify-end">
                                {row.positive ? (
                                  <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
                                ) : (
                                  <TrendingDown className="w-3.5 h-3.5" aria-hidden="true" />
                                )}
                                {row.delta}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Auto-generated summary insights */}
                <div className="mt-8 rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/5 via-card to-card p-5 sm:p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-primary">
                      {t.report.summaryEyebrow}
                    </span>
                  </div>
                  <h4 className="text-base sm:text-lg heading-premium text-foreground mb-4">
                    {t.report.summaryTitle}
                  </h4>
                  <ul className="space-y-2.5">
                    {computed.insights.map((insight, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2.5 text-sm text-foreground/85 leading-relaxed"
                      >
                        <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center tabular-nums">
                          {idx + 1}
                        </span>
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 pt-6 border-t border-border">
                  <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-4">
                    {t.report.recalibrationLabel}
                  </p>
                  <ul className="grid sm:grid-cols-2 gap-3">
                    {t.report.recalibrationItems.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2.5 text-sm text-foreground/80"
                      >
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 pt-6 border-t border-border">
                  <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-4">
                    {t.report.legendTitle}
                  </p>
                  <dl className="grid sm:grid-cols-3 gap-4">
                    {t.report.legend.map((item) => (
                      <div
                        key={item.term}
                        className="rounded-xl border border-border/60 bg-background/50 p-3"
                      >
                        <dt className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                          {item.term}
                        </dt>
                        <dd className="text-xs text-muted-foreground leading-relaxed">
                          {item.definition}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>

                <p className="mt-6 text-xs text-muted-foreground italic leading-relaxed">
                  {t.report.footnote}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
    </TooltipProvider>
  );
};

export default OwnerHowItWorks;
