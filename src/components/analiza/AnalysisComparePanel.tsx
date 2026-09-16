import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, BedDouble, FileDown, Home, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { ListingAnalysis } from "./AiListingAnalyzer";

const DAYS_PER_MONTH = 30.4;
const HOTEL_NET_FACTOR = 0.73; // 27% management + taxe
const RENT_NET_FACTOR = 0.9; // impozit + mici cheltuieli
const HOTEL_VS_RENT_MULTIPLIER = 1.6; // brut hotelier ≈ 1.6x chirie lungă
const EUR_RON = 5;

interface Props {
  analysis: ListingAnalysis;
  /** ocupare folosită pentru scenariul hotelier (default 75%) */
  occupancy?: number;
  /** link public al analizei, inclus în PDF-ul comparativ */
  shareUrl?: string | null;
}

const fmt = (n: number | null | undefined, suffix = "") =>
  typeof n === "number" && Number.isFinite(n)
    ? `${Math.round(n).toLocaleString("ro-RO")}${suffix}`
    : "—";

const AnalysisComparePanel = ({ analysis, occupancy = 75, shareUrl = null }: Props) => {
  const hotelGross = useMemo(() => {
    if (analysis.venit_lunar_brut) return analysis.venit_lunar_brut;
    return Math.round((analysis.tarif_noapte || 0) * DAYS_PER_MONTH * (occupancy / 100));
  }, [analysis.venit_lunar_brut, analysis.tarif_noapte, occupancy]);

  const suggestedRent = useMemo(
    () => Math.round(hotelGross / HOTEL_VS_RENT_MULTIPLIER),
    [hotelGross],
  );

  const [rent, setRent] = useState(suggestedRent);
  useEffect(() => setRent(suggestedRent), [suggestedRent]);

  const priceRon = useMemo(
    () => (analysis.pret_listare || 0) * (analysis.moneda === "RON" ? 1 : EUR_RON),
    [analysis.pret_listare, analysis.moneda],
  );

  const hotelNet = analysis.venit_lunar_net || Math.round(hotelGross * HOTEL_NET_FACTOR);
  const rentNet = Math.round(rent * RENT_NET_FACTOR);
  const yieldOf = (net: number) => (priceRon > 0 ? ((net * 12) / priceRon) * 100 : null);
  const hotelYield = yieldOf(hotelNet);
  const rentYield = yieldOf(rentNet);
  const diffMonth = hotelNet - rentNet;
  const diffPct = rentNet > 0 ? (diffMonth / rentNet) * 100 : null;
  const diffMonthEur = diffMonth / EUR_RON;
  const diffYearEur = (diffMonth * 12) / EUR_RON;
  const yieldGap =
    hotelYield !== null && rentYield !== null ? hotelYield - rentYield : null;

  const scenarios = [
    {
      key: "hotel",
      title: "Regim hotelier",
      subtitle: `${occupancy}% ocupare · management RealTrust`,
      icon: BedDouble,
      gross: hotelGross,
      net: hotelNet,
      yearly: hotelNet * 12,
      yieldPct: hotelYield,
      highlight: diffMonth >= 0,
    },
    {
      key: "rent",
      title: "Chirie termen lung",
      subtitle: "contract 12 luni · fără management",
      icon: Home,
      gross: rent,
      net: rentNet,
      yearly: rentNet * 12,
      yieldPct: rentYield,
      highlight: diffMonth < 0,
    },
  ];

  const downloadComparison = async () => {
    try {
      const [{ downloadComparePdf }, { trackConversion }] = await Promise.all([
        import("@/lib/analysisComparePdf"),
        import("@/lib/conversionTracking"),
      ]);
      downloadComparePdf({
        title: analysis.titlu || "Analiza potential regim hotelier",
        zone: analysis.zona || null,
        scenarios: scenarios.map((s) => ({
          title: s.title,
          subtitle: s.subtitle,
          gross: s.gross,
          net: s.net,
          yearly: s.yearly,
          yieldPct: s.yieldPct,
        })),
        diffMonthRon: diffMonth,
        diffMonthEur,
        diffYearEur,
        diffPct,
        yieldGapPp: yieldGap,
        shareUrl,
      });
      trackConversion({
        event: "download_yield_report",
        source: "analiza_comparatie_pdf",
      });
      toast.success("Raportul comparativ a fost descărcat.");
    } catch {
      toast.error("Nu am putut genera PDF-ul comparativ.");
    }
  };

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-4">
      <div className="space-y-1">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <ArrowLeftRight className="h-4 w-4 text-primary" aria-hidden="true" />
          Comparație scenarii: regim hotelier vs. chirie termen lung
        </h3>
        <p className="text-xs text-muted-foreground">
          Ambele variante sunt calculate pe aceleași date ale proprietății. Poți modifica chiria lunară
          estimată pentru a compara cu o ofertă reală — calculul se face local, fără consum de credite AI.
        </p>
      </div>

      <div className="max-w-xs space-y-2">
        <Label htmlFor="cmp-rent">Chirie lunară estimată (RON)</Label>
        <Input
          id="cmp-rent"
          type="number"
          min={0}
          inputMode="numeric"
          value={rent}
          onChange={(e) => setRent(Number(e.target.value) || 0)}
          aria-label="Chirie lunară estimată în RON pentru termen lung"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2" aria-label="Diferență de randament între scenarii">
        {diffPct !== null && (
          <Badge
            className={
              diffMonth >= 0
                ? "bg-primary text-primary-foreground"
                : "bg-destructive text-destructive-foreground"
            }
          >
            {diffMonth >= 0 ? "+" : "−"}
            {Math.abs(Math.round(diffPct))}% venit net vs. chirie
          </Badge>
        )}
        <Badge variant="secondary">
          Surplus lunar: {diffMonth >= 0 ? "+" : "−"}
          {fmt(Math.abs(diffMonthEur), " €")}
        </Badge>
        <Badge variant="secondary">
          Surplus anual: {diffMonth >= 0 ? "+" : "−"}
          {fmt(Math.abs(diffYearEur), " €")}
        </Badge>
        {yieldGap !== null && (
          <Badge variant="outline">
            Randament: {yieldGap >= 0 ? "+" : "−"}
            {Math.abs(yieldGap).toFixed(1).replace(".", ",")} pp
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {scenarios.map((s) => (
          <div
            key={s.key}
            className={`space-y-3 rounded-xl border p-4 ${
              s.highlight ? "border-primary/50 bg-primary/5" : "border-border bg-background"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <s.icon className="h-4 w-4 text-primary" aria-hidden="true" />
                  {s.title}
                </p>
                <p className="text-[11px] text-muted-foreground">{s.subtitle}</p>
              </div>
              {s.highlight && <Badge variant="secondary">Mai profitabil</Badge>}
            </div>

            <dl className="space-y-1.5 text-sm">
              {[
                { label: "Venit brut/lună", value: fmt(s.gross, " RON") },
                { label: "Venit net/lună", value: fmt(s.net, " RON") },
                { label: "Venit net/an", value: fmt(s.yearly, " RON") },
                {
                  label: "Randament net",
                  value: s.yieldPct ? `${s.yieldPct.toFixed(1).replace(".", ",")}%` : "—",
                },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">{r.label}</dt>
                  <dd className="font-semibold text-foreground">{r.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>

      <p className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
        <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        {diffMonth >= 0 ? (
          <span>
            Regimul hotelier aduce cu <strong className="text-foreground">{fmt(diffMonth, " RON")}</strong> mai
            mult net pe lună
            {diffPct !== null ? ` (+${Math.round(diffPct)}%)` : ""}, adică{" "}
            <strong className="text-foreground">{fmt(diffMonth * 12, " RON")}</strong> pe an, comparativ cu
            chiria pe termen lung.
          </span>
        ) : (
          <span>
            La chiria introdusă, termenul lung este mai avantajos cu{" "}
            <strong className="text-foreground">{fmt(Math.abs(diffMonth), " RON")}</strong> net pe lună. Cu
            optimizări de tarif și ocupare, regimul hotelier poate depăși acest nivel.
          </span>
        )}
      </p>

      <Button
        variant="outline"
        onClick={downloadComparison}
        className="w-full min-h-12"
        aria-label="Descarcă raportul PDF comparativ regim hotelier vs. chirie termen lung"
      >
        <FileDown className="mr-2 h-4 w-4" aria-hidden="true" />
        Descarcă PDF comparativ
      </Button>
    </section>
  );
};

export default AnalysisComparePanel;
