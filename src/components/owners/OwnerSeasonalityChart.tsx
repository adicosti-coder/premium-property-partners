import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { CalendarRange, TrendingDown, TrendingUp, Info, ArrowRight, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { trackConversion } from "@/lib/conversionTracking";

/**
 * OwnerSeasonalityChart — arată riscul real, lună cu lună, în loc de o medie anuală.
 * Cifre ilustrative pentru un apartament cu 2 camere în Timișoara (Cetate),
 * bazate pe pattern-ul sezonier al orașului. Pur prezentațional, RO/EN.
 */
const WHATSAPP_URL =
  "https://wa.me/40799069256?text=" +
  encodeURIComponent("Bună! Vreau proiecția lunară de venit pentru apartamentul meu.");

interface MonthRow {
  ro: string;
  en: string;
  occupancy: number;
  adr: number;
  net: number;
  noteRo?: string;
  noteEn?: string;
}

const MONTHS: MonthRow[] = [
  { ro: "Ian", en: "Jan", occupancy: 58, adr: 62, net: 700 },
  { ro: "Feb", en: "Feb", occupancy: 64, adr: 65, net: 790 },
  { ro: "Mar", en: "Mar", occupancy: 72, adr: 70, net: 950 },
  { ro: "Apr", en: "Apr", occupancy: 78, adr: 75, net: 1080, noteRo: "Sezon evenimente", noteEn: "Events season" },
  { ro: "Mai", en: "May", occupancy: 84, adr: 82, net: 1260, noteRo: "Festivaluri", noteEn: "Festivals" },
  { ro: "Iun", en: "Jun", occupancy: 82, adr: 84, net: 1250 },
  { ro: "Iul", en: "Jul", occupancy: 76, adr: 80, net: 1100 },
  { ro: "Aug", en: "Aug", occupancy: 77, adr: 78, net: 1130 },
  { ro: "Sep", en: "Sep", occupancy: 86, adr: 88, net: 1380, noteRo: "Business + conferințe", noteEn: "Business + conferences" },
  { ro: "Oct", en: "Oct", occupancy: 83, adr: 84, net: 1270 },
  { ro: "Noi", en: "Nov", occupancy: 71, adr: 72, net: 960 },
  { ro: "Dec", en: "Dec", occupancy: 74, adr: 79, net: 1050, noteRo: "Târg de Crăciun", noteEn: "Christmas market" },
];

const OwnerSeasonalityChart = () => {
  const { language } = useLanguage();
  const isRo = language === "ro";

  const t = isRo
    ? {
        badge: "Sezonalitate reală",
        title: "Cum arată anul, lună cu lună — inclusiv lunile slabe",
        subtitle:
          "Nu îți vindem doar media anuală. Vezi și ianuarie, luna cea mai slabă din Timișoara, ca să știi exact la ce te înscrii.",
        chartTitle: "Ocupare și venit net estimat pe lună",
        occupancy: "Ocupare (%)",
        net: "Venit net (€)",
        adr: "Tarif mediu (€/noapte)",
        lowTitle: "Cea mai slabă lună",
        lowValue: "Ianuarie — 58% ocupare, ~700 € net",
        lowNote:
          "Chiar și în luna cea mai slabă, venitul net depășește chiria clasică medie pentru un apartament similar.",
        highTitle: "Cea mai bună lună",
        highValue: "Septembrie — 86% ocupare, ~1.380 € net",
        highNote:
          "Sezonul de business și conferințe din Timișoara ridică atât ocuparea, cât și tariful pe noapte.",
        avgTitle: "Media anuală",
        avgValue: "75% ocupare, ~13.900 € net / an",
        avgNote:
          "Media pe care o folosim în calculator este exact media acestor 12 luni — nu doar vârful de sezon.",
        disclaimer:
          "Cifre ilustrative pentru un apartament cu 2 camere, mobilat modern, în Cetate. Rezultatele reale depind de zonă, dotări, capacitate și recenzii. Îți facem proiecția pe apartamentul tău, cu cifrele tale.",
        ctaPrimary: "Cere proiecția mea lunară",
        ctaSecondary: "Deschide calculatorul ROI",
        tooltipOccupancy: "Ocupare",
        tooltipNet: "Net",
        tooltipAdr: "Tarif mediu",
      }
    : {
        badge: "Real seasonality",
        title: "What the year looks like, month by month — weak months included",
        subtitle:
          "We don't sell you the annual average only. See January too, Timișoara's weakest month, so you know exactly what you're signing up for.",
        chartTitle: "Occupancy and estimated net income per month",
        occupancy: "Occupancy (%)",
        net: "Net income (€)",
        adr: "Average rate (€/night)",
        lowTitle: "Weakest month",
        lowValue: "January — 58% occupancy, ~€700 net",
        lowNote:
          "Even in the weakest month, net income still beats the average classic rent for a comparable apartment.",
        highTitle: "Best month",
        highValue: "September — 86% occupancy, ~€1,380 net",
        highNote:
          "Timișoara's business and conference season lifts both occupancy and the nightly rate.",
        avgTitle: "Annual average",
        avgValue: "75% occupancy, ~€13,900 net / year",
        avgNote:
          "The average we use in the calculator is exactly the average of these 12 months — not just peak season.",
        disclaimer:
          "Illustrative figures for a modern 2-room apartment in Cetate. Actual results depend on area, amenities, capacity and reviews. We build the projection for your apartment, with your numbers.",
        ctaPrimary: "Request my monthly projection",
        ctaSecondary: "Open the ROI calculator",
        tooltipOccupancy: "Occupancy",
        tooltipNet: "Net",
        tooltipAdr: "Avg. rate",
      };

  const data = MONTHS.map((m) => ({
    month: isRo ? m.ro : m.en,
    [t.occupancy]: m.occupancy,
    [t.net]: m.net,
    [t.adr]: m.adr,
    note: isRo ? m.noteRo : m.noteEn,
  }));

  const handleRequest = () => {
    trackConversion({ event: "whatsapp_click", source: "owners_seasonality_chart" });
  };

  return (
    <section className="py-20 bg-background" aria-labelledby="owner-seasonality-title">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge variant="secondary" className="mb-4">
            <CalendarRange className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
            {t.badge}
          </Badge>
          <h2
            id="owner-seasonality-title"
            className="text-3xl md:text-4xl font-serif font-semibold text-foreground mb-4"
          >
            {t.title}
          </h2>
          <p className="text-muted-foreground">{t.subtitle}</p>
        </div>

        <Card className="max-w-5xl mx-auto border-border">
          <CardHeader>
            <CardTitle className="text-lg">{t.chartTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="h-[340px] w-full" role="img" aria-label={t.chartTitle}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="left"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.75rem",
                      color: "hsl(var(--foreground))",
                      fontSize: "0.8rem",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "0.75rem" }} />
                  <Bar
                    yAxisId="left"
                    dataKey={t.net}
                    fill="hsl(var(--primary))"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={38}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey={t.occupancy}
                    stroke="hsl(var(--foreground))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="rounded-xl border border-border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-4 h-4 text-primary" aria-hidden="true" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t.lowTitle}
                  </p>
                </div>
                <p className="font-semibold text-foreground text-sm mb-1">{t.lowValue}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{t.lowNote}</p>
              </div>
              <div className="rounded-xl border border-border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-primary" aria-hidden="true" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t.highTitle}
                  </p>
                </div>
                <p className="font-semibold text-foreground text-sm mb-1">{t.highValue}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{t.highNote}</p>
              </div>
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-primary" aria-hidden="true" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    {t.avgTitle}
                  </p>
                </div>
                <p className="font-semibold text-foreground text-sm mb-1">{t.avgValue}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{t.avgNote}</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-3">
              {t.disclaimer}
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild className="flex-1" onClick={handleRequest}>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t.ctaPrimary}
                >
                  <MessageCircle className="w-4 h-4 mr-2" aria-hidden="true" />
                  {t.ctaPrimary}
                </a>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link to="/calculator-roi" aria-label={t.ctaSecondary}>
                  {t.ctaSecondary}
                  <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default OwnerSeasonalityChart;
