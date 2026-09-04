import { lazy, Suspense, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, ArrowRight, Building2, Calculator, CheckCircle2, ClipboardCheck, Clock3, Gauge, HelpCircle, Home, Landmark, LineChart as LineChartIcon, MapPin, PieChart, Scale, Target, TrendingUp, WalletCards } from "lucide-react";
import Header from "@/components/Header";
import SEOHead from "@/components/SEOHead";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import BackToTop from "@/components/BackToTop";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useRegisterFAQs } from "@/hooks/useFAQSchema";
import { REAL_ESTATE_AGENT_REF } from "@/lib/orgIdentity";

const Footer = lazy(() => import("@/components/Footer"));
const GlobalConversionWidgets = lazy(() => import("@/components/GlobalConversionWidgets"));

const marketEvolution = [
  { year: "2021", premium: 1600, central: 1450, metro: 1180 },
  { year: "2022", premium: 1780, central: 1580, metro: 1300 },
  { year: "2023", premium: 1950, central: 1710, metro: 1420 },
  { year: "2024", premium: 2140, central: 1860, metro: 1550 },
  { year: "2025", premium: 2320, central: 1990, metro: 1680 },
  { year: "2026", premium: 2480, central: 2140, metro: 1810 },
];

const complexLinks = [
  { name: "ISHO", href: "/complexe/isho", profile: "premium urban", yield: "8.8–10.2%" },
  { name: "City of Mara", href: "/complexe/city-of-mara", profile: "central business", yield: "8.4–9.8%" },
  { name: "Ateneo", href: "/complexe/ateneo", profile: "nou, lichiditate bună", yield: "8.0–9.6%" },
  { name: "Fructus Plaza", href: "/complexe/fructus-plaza", profile: "ultracentral", yield: "9.0–10.5%" },
];

const scenarioCards = [
  { title: "Conservator", occupancy: "62%", adr: "55–65€", roi: "6.8–8.0%", note: "potrivit pentru apartamente standard, fără poziționare premium" },
  { title: "RealTrust standard", occupancy: "75%", adr: "68–82€", roi: "9.0–9.8%", note: "modelul de lucru recomandat pentru randament stabil" },
  { title: "Premium complex", occupancy: "80%+", adr: "85–110€", roi: "10%+", note: "unități în complexe noi, aproape de business și servicii" },
];

const sensitivityMatrix = [
  { occupancy: "60%", adr60: "7.6%", adr75: "9.6%", adr90: "11.5%" },
  { occupancy: "70%", adr60: "8.8%", adr75: "11.2%", adr90: "13.4%" },
  { occupancy: "80%", adr60: "10.2%", adr75: "12.8%", adr90: "15.4%" },
];

const investmentLevers = [
  { icon: Target, title: "Poziționare în piață", text: "Fotografii, dotări și descriere calibrate pentru oaspeți business, city-break și relocări." },
  { icon: WalletCards, title: "Controlul costurilor", text: "Analiza include curățenie, mentenanță, taxe, comisioane și perioade cu ocupare redusă." },
  { icon: Clock3, title: "Viteză de recuperare", text: "Modelăm în câți ani se recuperează investiția prin venit net și apreciere de capital." },
];

const decisionRules = [
  { label: "Cumpără", threshold: "82+", text: "ROI net competitiv, ocupare bună și potențial de apreciere peste media zonei." },
  { label: "Negociază", threshold: "68–81", text: "Proprietatea poate funcționa, dar prețul, mobilarea sau costurile trebuie optimizate." },
  { label: "Evită temporar", threshold: "sub 68", text: "Riscul operațional sau prețul de intrare pot bloca randamentul net." },
];

const zoneCriteria = [
  "Distanță bună față de centru, business hub-uri, universități sau spitale",
  "Acces la transport, parcare și servicii de zi cu zi",
  "Complex cu reputație bună, administrare predictibilă și costuri transparente",
  "Cerere mixtă: chiriași pe termen lung, oaspeți business și sejururi scurte",
];

const relatedGuides = [
  { label: "Calculator ROI", href: "/calculator-roi", text: "Compară rapid chiria clasică și regimul hotelier." },
  { label: "Catalog Investiții", href: "/catalog-investitii", text: "Vezi oportunități filtrate după randament și risc." },
  { label: "Piața imobiliară", href: "/piata-imobiliara-timisoara", text: "Urmărește tendințe locale, prețuri și cerere." },
];

const investorChecklist = [
  "Verifică randamentul net, nu doar chiria brută estimată",
  "Compară cererea de închiriere clasică vs. regim hotelier în zonă",
  "Include costurile de mobilare, mentenanță, taxe și perioade fără ocupare",
  "Analizează lichiditatea complexului: acces, parcări, servicii și reputație",
];

const riskSignals = [
  { title: "Preț peste media zonei", text: "Un discount mic la achiziție poate reduce ani întregi de profit net." },
  { title: "Fără diferențiator pentru oaspeți", text: "Apartamentele greu de poziționat au ocupare mai volatilă și tarife mai mici." },
  { title: "Costuri operaționale ignorate", text: "Curățenia, mentenanța și taxele trebuie scăzute înainte de a comunica ROI-ul." },
];

const faqItems = [
  { question: "Cum se calculează randamentul unei investiții imobiliare?", answer: "Randamentul net se calculează împărțind venitul anual după costuri la valoarea totală a investiției. În analiza RealTrust includem ocuparea, tariful mediu, costurile operaționale și o deducere standard de 27%." },
  { question: "Ce înseamnă analiză profit apartament în România?", answer: "Este o estimare completă a profitului lunar și anual pentru un apartament, comparând chiria clasică, regimul hotelier, aprecierea prețului și lichiditatea zonei." },
  { question: "De ce sunt importante complexele rezidențiale în analiza ROI?", answer: "Complexele noi au de obicei cerere mai bună, costuri de mentenanță mai previzibile și poziționare mai ușor de promovat către oaspeți sau chiriași premium." },
  { question: "Pot folosi calculatorul pentru orice oraș din România?", answer: "Da, modelul funcționează pentru orice oraș dacă ajustezi prețul de achiziție, chiria, tariful pe noapte și ocuparea. Pentru Timișoara folosim repere operaționale verificate RealTrust." },
  { question: "Când merită cumpărat un apartament pentru investiție?", answer: "Merită analizat când randamentul net depășește chiria clasică, zona are cerere constantă, costurile sunt previzibile și există potențial de revânzare sau apreciere pe termen mediu." },
  { question: "Ce documente sunt utile pentru o analiză ROI completă?", answer: "Sunt utile prețul final de achiziție, suprafața, planul apartamentului, costurile de mobilare, istoricul zonei, taxele lunare și obiectivul investitorului: cashflow, apreciere sau revânzare." },
];

const AnalizaROIApartament = () => {
  const [purchasePrice, setPurchasePrice] = useState(125000);
  const [monthlyRent, setMonthlyRent] = useState(620);
  const [nightlyRate, setNightlyRate] = useState(72);
  const [occupancy, setOccupancy] = useState(75);
  const [annualGrowth, setAnnualGrowth] = useState(6);

  useRegisterFAQs("analiza-roi-apartament", faqItems);

  const calculations = useMemo(() => {
    const classicAnnual = monthlyRent * 12;
    const hotelGross = nightlyRate * 365 * (occupancy / 100);
    const hotelNet = hotelGross * 0.73;
    const classicRoi = (classicAnnual / purchasePrice) * 100;
    const hotelRoi = (hotelNet / purchasePrice) * 100;
    const appreciation = (purchasePrice * annualGrowth) / 100;
    const totalReturn = hotelNet + appreciation;
    const monthlyHotelNet = hotelNet / 12;
    const paybackYears = purchasePrice / Math.max(totalReturn, 1);
    const breakevenOccupancy = (classicAnnual / (nightlyRate * 365 * 0.73)) * 100;
    const investmentScore = Math.min(98, Math.max(45, Math.round(hotelRoi * 6 + annualGrowth * 4 + (occupancy - 55) * 0.8)));
    const scoreLabel = investmentScore >= 82 ? "foarte atractiv" : investmentScore >= 68 ? "solid" : "necesită verificări";

    const projection = Array.from({ length: 6 }, (_, index) => {
      const year = 2026 + index;
      const value = Math.round(purchasePrice * Math.pow(1 + annualGrowth / 100, index));
      const netIncome = Math.round(hotelNet * Math.pow(1.025, index));
      return { year: `${year}`, value, netIncome, total: value + netIncome };
    });

    return {
      classicAnnual: Math.round(classicAnnual),
      hotelNet: Math.round(hotelNet),
      classicRoi: classicRoi.toFixed(1),
      hotelRoi: hotelRoi.toFixed(1),
      totalReturn: Math.round(totalReturn),
      monthlyHotelNet: Math.round(monthlyHotelNet),
      paybackYears: paybackYears.toFixed(1),
      breakevenOccupancy: Math.min(95, Math.max(25, breakevenOccupancy)).toFixed(0),
      investmentScore,
      scoreLabel,
      projection,
      delta: Math.round(hotelNet - classicAnnual),
    };
  }, [annualGrowth, monthlyRent, nightlyRate, occupancy, purchasePrice]);

  const comparisonData = [
    { name: "Chirie clasică", value: calculations.classicAnnual, color: "hsl(var(--muted-foreground))" },
    { name: "Regim hotelier", value: calculations.hotelNet, color: "hsl(var(--primary))" },
    { name: "Randament total", value: calculations.totalReturn, color: "hsl(var(--accent))" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Analiza ROI Apartament | Randament investiții imobiliare"
        description="Analiză profit apartament România: calculează randament investiții imobiliare, ROI net, evoluția prețurilor și zonele potrivite pentru investiții în complexe."
        url="https://realtrust.ro/analiza-roi-apartament"
        jsonLd={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "FinancialProduct",
              name: "Analiza ROI Apartament România",
              description: "Calculator interactiv pentru randament investiții imobiliare, profit apartament și proiecții de apreciere a prețurilor în România.",
              url: "https://realtrust.ro/analiza-roi-apartament",
              provider: { ...REAL_ESTATE_AGENT_REF, areaServed: "România" },
            },
            {
              "@type": "HowTo",
              name: "Cum analizezi profitul unui apartament",
              step: [
                { "@type": "HowToStep", name: "Introdu prețul de achiziție" },
                { "@type": "HowToStep", name: "Compară chiria clasică cu regimul hotelier" },
                { "@type": "HowToStep", name: "Verifică evoluția prețului și complexele potrivite" },
              ],
            },
            {
              "@type": "FAQPage",
              mainEntity: faqItems.map((item) => ({
                "@type": "Question",
                name: item.question,
                acceptedAnswer: { "@type": "Answer", text: item.answer },
              })),
            },
          ],
        }}
      />
      <Header />

      <main className="pt-24 pb-16">
        <section className="border-b border-border bg-gradient-to-b from-background to-muted/40">
          <div className="container mx-auto px-4 py-10 md:py-16">
            <PageBreadcrumb items={[{ label: "Analiza ROI Apartament" }]} className="mb-8" />
            <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
              <div>
                <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
                  <TrendingUp className="h-4 w-4" /> Randament investiții imobiliare
                </p>
                <h1 className="text-4xl font-bold tracking-normal text-foreground md:text-5xl">
                  Analiza ROI Apartament pentru investiții profitabile în România
                </h1>
                <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
                  Estimează profitul net al unui apartament, compară chiria clasică cu administrarea în regim hotelier și verifică evoluția prețurilor pe zone cu cerere ridicată.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Button asChild size="lg"><a href="#calculator">Calculează randamentul</a></Button>
                  <Button asChild size="lg" variant="outline"><Link to="/ansambluri-rezidentiale">Vezi Complexe <ArrowRight className="h-4 w-4" /></Link></Button>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                <Card className="border-primary/20 bg-primary/5"><CardContent className="p-5"><p className="text-sm text-muted-foreground">ROI net verificat</p><p className="mt-1 text-3xl font-bold text-primary">9.4%</p></CardContent></Card>
                <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Ocupare medie modelată</p><p className="mt-1 text-3xl font-bold text-foreground">75%</p></CardContent></Card>
                <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Costuri deduse automat</p><p className="mt-1 text-3xl font-bold text-foreground">27%</p></CardContent></Card>
              </div>
            </div>
          </div>
        </section>

        <section id="calculator" className="container mx-auto px-4 py-14 md:py-20">
          <div className="mb-8 max-w-3xl">
            <div className="mb-3 flex items-center gap-2 text-primary"><Calculator className="h-5 w-5" /><span className="text-sm font-semibold uppercase">Calculator interactiv</span></div>
            <h2 className="text-3xl font-bold text-foreground">Analiză profit apartament România</h2>
            <p className="mt-3 text-muted-foreground">Ajustează prețul, chiria, tariful pe noapte și ocuparea pentru a estima randamentul anual net.</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <Card>
              <CardContent className="space-y-6 p-6">
                <div>
                  <Label htmlFor="price">Preț achiziție</Label>
                  <Input id="price" type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(Number(e.target.value) || 0)} className="mt-2" />
                  <Slider value={[purchasePrice]} min={60000} max={350000} step={5000} onValueChange={([value]) => setPurchasePrice(value)} className="mt-4" aria-label="Preț achiziție apartament" />
                </div>
                <div>
                  <Label htmlFor="rent">Chirie clasică lunară</Label>
                  <Input id="rent" type="number" value={monthlyRent} onChange={(e) => setMonthlyRent(Number(e.target.value) || 0)} className="mt-2" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Tarif/noapte</Label>
                    <Slider value={[nightlyRate]} min={35} max={140} step={1} onValueChange={([value]) => setNightlyRate(value)} className="mt-4" aria-label="Tarif pe noapte" />
                    <p className="mt-2 text-sm font-semibold text-primary">{nightlyRate} €/noapte</p>
                  </div>
                  <div>
                    <Label>Ocupare</Label>
                    <Slider value={[occupancy]} min={45} max={90} step={1} onValueChange={([value]) => setOccupancy(value)} className="mt-4" aria-label="Rată de ocupare" />
                    <p className="mt-2 text-sm font-semibold text-primary">{occupancy}%</p>
                  </div>
                </div>
                <div>
                  <Label>Apreciere anuală preț</Label>
                  <Slider value={[annualGrowth]} min={1} max={10} step={0.5} onValueChange={([value]) => setAnnualGrowth(value)} className="mt-4" aria-label="Apreciere anuală preț" />
                  <p className="mt-2 text-sm font-semibold text-primary">{annualGrowth}%/an</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div><p className="text-sm text-muted-foreground">ROI chirie clasică</p><p className="text-3xl font-bold text-foreground">{calculations.classicRoi}%</p></div>
                  <div><p className="text-sm text-muted-foreground">ROI net regim hotelier</p><p className="text-3xl font-bold text-primary">{calculations.hotelRoi}%</p></div>
                  <div><p className="text-sm text-muted-foreground">Diferență anuală</p><p className="text-3xl font-bold text-foreground">+{calculations.delta.toLocaleString("ro-RO")}€</p></div>
                </div>
                <div className="mt-5 grid gap-3 rounded-lg border border-primary/20 bg-background/80 p-4 sm:grid-cols-3">
                  <div><p className="text-xs text-muted-foreground">Net lunar estimat</p><p className="text-lg font-semibold text-foreground">{calculations.monthlyHotelNet.toLocaleString("ro-RO")}€</p></div>
                  <div><p className="text-xs text-muted-foreground">Recuperare capital</p><p className="text-lg font-semibold text-foreground">{calculations.paybackYears} ani</p></div>
                  <div><p className="text-xs text-muted-foreground">Ocupare break-even</p><p className="text-lg font-semibold text-foreground">{calculations.breakevenOccupancy}%</p></div>
                </div>
                <div className="mt-8 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(value) => `${Number(value) / 1000}k€`} />
                      <Tooltip formatter={(value: number) => [`${value.toLocaleString("ro-RO")} €/an`, ""]} contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>{comparisonData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6 border-primary/20 bg-background">
            <CardContent className="grid gap-6 p-6 md:grid-cols-[auto_1fr_auto] md:items-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-8 border-primary/20 bg-primary/10">
                <span className="text-3xl font-bold text-primary">{calculations.investmentScore}</span>
              </div>
              <div>
                <div className="mb-2 flex items-center gap-2 text-primary"><Gauge className="h-5 w-5" /><span className="text-sm font-semibold uppercase">Scor investițional</span></div>
                <h2 className="text-2xl font-bold text-foreground">Profil {calculations.scoreLabel} pentru investiție imobiliară</h2>
                <p className="mt-2 text-muted-foreground">Scorul combină ROI net, ocupare estimată, aprecierea anuală și diferența față de chiria clasică pentru o decizie mai rapidă.</p>
              </div>
              <Button asChild variant="outline"><Link to="/evaluare-gratuita">Cere validare RealTrust</Link></Button>
            </CardContent>
          </Card>
        </section>

        <section className="bg-muted/40 py-14 md:py-20">
          <div className="container mx-auto px-4">
            <div className="mb-8 max-w-3xl">
              <div className="mb-3 flex items-center gap-2 text-primary"><Scale className="h-5 w-5" /><span className="text-sm font-semibold uppercase">Cadru de decizie</span></div>
              <h2 className="text-3xl font-bold text-foreground">Cumpără, negociază sau evită?</h2>
              <p className="mt-3 text-muted-foreground">Folosește scorul investițional ca filtru inițial, apoi validează zona, costurile și potențialul de administrare profesională.</p>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {decisionRules.map((rule) => (
                <Card key={rule.label} className="border-border bg-card">
                  <CardContent className="p-6">
                    <p className="text-sm font-semibold text-primary">Scor {rule.threshold}</p>
                    <h3 className="mt-2 text-2xl font-bold text-foreground">{rule.label}</h3>
                    <p className="mt-3 text-sm text-muted-foreground">{rule.text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card className="mt-6 border-primary/20 bg-primary/5">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center gap-2 text-primary"><MapPin className="h-5 w-5" /><h3 className="text-xl font-semibold text-foreground">Criterii de zonă cu impact direct în ROI</h3></div>
                <div className="grid gap-3 md:grid-cols-2">
                  {zoneCriteria.map((item) => (
                    <div key={item} className="flex gap-3 rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="border-y border-border bg-background py-14 md:py-20">
          <div className="container mx-auto px-4">
            <div className="mb-8 max-w-3xl">
              <div className="mb-3 flex items-center gap-2 text-primary"><Target className="h-5 w-5" /><span className="text-sm font-semibold uppercase">Optimizare randament</span></div>
              <h2 className="text-3xl font-bold text-foreground">Ce influențează profitul net al apartamentului</h2>
              <p className="mt-3 text-muted-foreground">Randamentul nu depinde doar de preț. Cele mai importante diferențe apar din poziționare, costuri reale și disciplină operațională.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {investmentLevers.map((item) => (
                <Card key={item.title} className="border-primary/20 bg-primary/5">
                  <CardContent className="p-6">
                    <item.icon className="mb-4 h-8 w-8 text-primary" />
                    <h3 className="text-xl font-semibold text-foreground">{item.title}</h3>
                    <p className="mt-3 text-sm text-muted-foreground">{item.text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mt-8 overflow-hidden rounded-lg border border-border bg-card">
              <div className="grid grid-cols-4 border-b border-border bg-muted/40 text-sm font-semibold text-foreground">
                <div className="p-4">Ocupare / ADR</div><div className="p-4">60€</div><div className="p-4">75€</div><div className="p-4">90€</div>
              </div>
              {sensitivityMatrix.map((row) => (
                <div key={row.occupancy} className="grid grid-cols-4 border-b border-border last:border-b-0 text-sm">
                  <div className="p-4 font-semibold text-foreground">{row.occupancy}</div><div className="p-4 text-muted-foreground">{row.adr60}</div><div className="p-4 text-primary font-semibold">{row.adr75}</div><div className="p-4 text-muted-foreground">{row.adr90}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-muted/40 py-14 md:py-20">
          <div className="container mx-auto px-4">
            <div className="mb-8 flex items-center gap-2 text-primary"><LineChartIcon className="h-5 w-5" /><span className="text-sm font-semibold uppercase">Evoluție prețuri</span></div>
            <div className="grid gap-6 lg:grid-cols-2">
              <Card><CardContent className="p-6"><h2 className="mb-6 text-2xl font-bold text-foreground">Preț mediu €/mp pe segmente</h2><div className="h-80"><ResponsiveContainer width="100%" height="100%"><LineChart data={marketEvolution}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="year" stroke="hsl(var(--muted-foreground))" /><YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(value) => `${value}€`} /><Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }} /><Line type="monotone" dataKey="premium" name="Premium" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} /><Line type="monotone" dataKey="central" name="Central" stroke="hsl(var(--accent))" strokeWidth={3} dot={false} /><Line type="monotone" dataKey="metro" name="Metropolitan" stroke="hsl(var(--muted-foreground))" strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer></div></CardContent></Card>
              <Card><CardContent className="p-6"><h2 className="mb-6 text-2xl font-bold text-foreground">Proiecție valoare + venit net</h2><div className="h-80"><ResponsiveContainer width="100%" height="100%"><AreaChart data={calculations.projection}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="year" stroke="hsl(var(--muted-foreground))" /><YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k€`} /><Tooltip formatter={(value: number) => [`${value.toLocaleString("ro-RO")} €`, ""]} contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }} /><Area type="monotone" dataKey="value" name="Valoare apartament" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.18)" /><Area type="monotone" dataKey="netIncome" name="Venit net anual" stroke="hsl(var(--accent))" fill="hsl(var(--accent) / 0.16)" /></AreaChart></ResponsiveContainer></div></CardContent></Card>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-14 md:py-20">
          <div className="mb-8 max-w-3xl"><div className="mb-3 flex items-center gap-2 text-primary"><CheckCircle2 className="h-5 w-5" /><span className="text-sm font-semibold uppercase">Scenarii de randament</span></div><h2 className="text-3xl font-bold text-foreground">Ce scenariu se potrivește apartamentului tău?</h2><p className="mt-3 text-muted-foreground">Folosește aceste repere pentru a interpreta rezultatul calculatorului și pentru a decide dacă merită o analiză detaliată.</p></div>
          <div className="grid gap-4 md:grid-cols-3">
            {scenarioCards.map((scenario) => (
              <Card key={scenario.title} className="border-border bg-card">
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold text-foreground">{scenario.title}</h3>
                  <div className="mt-5 grid gap-3 text-sm">
                    <div className="flex justify-between gap-3"><span className="text-muted-foreground">Ocupare</span><span className="font-semibold text-foreground">{scenario.occupancy}</span></div>
                    <div className="flex justify-between gap-3"><span className="text-muted-foreground">Tarif/noapte</span><span className="font-semibold text-foreground">{scenario.adr}</span></div>
                    <div className="flex justify-between gap-3"><span className="text-muted-foreground">ROI net</span><span className="font-semibold text-primary">{scenario.roi}</span></div>
                  </div>
                  <p className="mt-5 text-sm text-muted-foreground">{scenario.note}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-background py-14 md:py-20">
          <div className="container mx-auto px-4">
            <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
              <div>
                <div className="mb-3 flex items-center gap-2 text-primary"><ClipboardCheck className="h-5 w-5" /><span className="text-sm font-semibold uppercase">Due diligence investitor</span></div>
                <h2 className="text-3xl font-bold text-foreground">Checklist înainte de achiziția unui apartament pentru profit</h2>
                <p className="mt-3 text-muted-foreground">O analiză corectă nu se oprește la preț și chirie. Pentru randament investiții imobiliare sustenabil, modelăm venitul net, riscurile operaționale și potențialul de revânzare.</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button asChild><Link to="/catalog-investitii">Catalog Investiții <ArrowRight className="h-4 w-4" /></Link></Button>
                  <Button asChild variant="outline"><Link to="/pentru-proprietari">Contact Proprietari</Link></Button>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-primary/20 bg-primary/5 md:row-span-2">
                  <CardContent className="p-6">
                    <PieChart className="mb-4 h-8 w-8 text-primary" />
                    <h3 className="text-xl font-semibold text-foreground">Ce verificăm în analiza RealTrust</h3>
                    <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
                      {investorChecklist.map((item) => <li key={item} className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span>{item}</span></li>)}
                    </ul>
                  </CardContent>
                </Card>
                {riskSignals.map((risk) => (
                  <Card key={risk.title}>
                    <CardContent className="p-5">
                      <AlertTriangle className="mb-3 h-6 w-6 text-primary" />
                      <h3 className="font-semibold text-foreground">{risk.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{risk.text}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-muted/40 py-14 md:py-20">
          <div className="container mx-auto px-4">
          <div className="mb-8 max-w-3xl"><div className="mb-3 flex items-center gap-2 text-primary"><Building2 className="h-5 w-5" /><span className="text-sm font-semibold uppercase">Link-uri strategice</span></div><h2 className="text-3xl font-bold text-foreground">Complexe recomandate pentru analiză ROI</h2><p className="mt-3 text-muted-foreground">Compară potențialul de randament al apartamentelor din ansambluri cu cerere ridicată și poziționare bună pentru închiriere.</p></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {complexLinks.map((item) => (
              <Link key={item.name} to={item.href} className="group rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/50">
                <Home className="mb-4 h-7 w-7 text-primary" />
                <h3 className="text-xl font-semibold text-foreground group-hover:text-primary">{item.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.profile}</p>
                <p className="mt-4 text-sm font-semibold text-primary">ROI estimat {item.yield}</p>
              </Link>
            ))}
          </div>
          <div className="mt-8 rounded-lg border border-primary/20 bg-primary/5 p-6 md:flex md:items-center md:justify-between">
            <div><Landmark className="mb-3 h-7 w-7 text-primary" /><h3 className="text-2xl font-bold text-foreground">Vrei o analiză pe o proprietate concretă?</h3><p className="mt-2 text-muted-foreground">Trimite apartamentul sau zona dorită și primești o estimare adaptată pieței locale.</p></div>
            <div className="mt-5 flex flex-wrap gap-3 md:mt-0"><Button asChild><Link to="/ansambluri-rezidentiale">Toate complexele</Link></Button><Button asChild variant="outline"><Link to="/evaluare-gratuita">Evaluare gratuită</Link></Button></div>
          </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-14 md:py-20">
          <div className="mb-10 rounded-lg border border-primary/20 bg-primary/5 p-6 md:p-8">
            <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Continuă analiza cu ghidurile potrivite</h2>
                <p className="mt-2 text-muted-foreground">Leagă estimarea ROI de paginile care ajută decizia: calculator, catalog și context de piață.</p>
              </div>
              <Button asChild size="lg"><Link to="/catalog-investitii">Catalog Investiții <ArrowRight className="h-4 w-4" /></Link></Button>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {relatedGuides.map((guide) => (
                <Link key={guide.href} to={guide.href} className="rounded-lg border border-border bg-background p-4 transition-colors hover:border-primary/50">
                  <span className="font-semibold text-foreground">{guide.label}</span>
                  <p className="mt-2 text-sm text-muted-foreground">{guide.text}</p>
                </Link>
              ))}
            </div>
          </div>
          <div className="mb-6 flex items-center gap-2 text-primary"><HelpCircle className="h-5 w-5" /><h2 className="text-3xl font-bold text-foreground">Întrebări frecvente</h2></div>
          <Accordion type="single" collapsible className="rounded-lg border border-border bg-card px-6" itemScope itemType="https://schema.org/FAQPage">
            {faqItems.map((item, index) => (
              <AccordionItem key={item.question} value={`faq-${index}`} className="last:border-b-0" itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
                <AccordionTrigger className="text-left text-foreground" itemProp="name">{item.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground" itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer"><span itemProp="text">{item.answer}</span></AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      </main>

      <Suspense fallback={null}>
        <Footer />
        <GlobalConversionWidgets />
      </Suspense>
      <BackToTop />
    </div>
  );
};

export default AnalizaROIApartament;