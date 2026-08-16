import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { emitOwnerRoiPrefill, scrollToOwnerContactForm } from "@/lib/ownerRoiPrefill";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { ArrowRight, Calculator, TrendingUp, Info } from "lucide-react";

/**
 * OwnerRoiEstimator — estimator interactiv de venit: chirie clasică vs regim hotelier RealTrust.
 * Model: venit brut hotelier = chirie clasică x multiplicator tip proprietate x factor zonă,
 * la ocupare medie ~75%; venitul net aplică deducerea standard de 27% (management + taxe + operare).
 * Cifrele sunt orientative — evaluarea exactă se face pe proprietate.
 */

type PropertyTypeKey = "garsoniera" | "2-camere" | "3-camere";

const PROPERTY_TYPES: { key: PropertyTypeKey; mult: number; ro: string; en: string }[] = [
  { key: "garsoniera", mult: 2.1, ro: "Garsonieră / Studio", en: "Studio" },
  { key: "2-camere", mult: 2.0, ro: "2 camere", en: "2 bedrooms" },
  { key: "3-camere", mult: 1.85, ro: "3+ camere", en: "3+ bedrooms" },
];

const ZONES: { key: string; slug: string; factor: number; ro: string; en: string }[] = [
  { key: "isho", slug: "isho", factor: 1.06, ro: "ISHO", en: "ISHO" },
  { key: "city-of-mara", slug: "alta", factor: 1.04, ro: "City of Mara", en: "City of Mara" },
  {
    key: "circumvalatiunii",
    slug: "circumvalatiunii",
    factor: 1.0,
    ro: "Circumvalațiunii",
    en: "Circumvalațiunii",
  },
  { key: "centru", slug: "alta", factor: 1.08, ro: "Centru / Altele", en: "City centre / Other" },
];

const OCCUPANCY = 0.75;
const DEDUCTION = 0.27; // management, taxe, curățenie, consumabile
const CLASSIC_NET_FACTOR = 0.95; // mici cheltuieli/goluri la chiria clasică

const fmt = (value: number, isRo: boolean) =>
  new Intl.NumberFormat(isRo ? "ro-RO" : "en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Math.round(value));

const OwnerRoiEstimator = () => {
  const { language } = useLanguage();
  const isRo = language === "ro";

  const [typeKey, setTypeKey] = useState<PropertyTypeKey>("2-camere");
  const [zoneKey, setZoneKey] = useState<string>("circumvalatiunii");
  const [rent, setRent] = useState<number>(500);

  const selectedType = PROPERTY_TYPES.find((p) => p.key === typeKey)!;
  const selectedZone = ZONES.find((z) => z.key === zoneKey)!;

  const result = useMemo(() => {
    const classicAnnualGross = rent * 12;
    const classicAnnualNet = classicAnnualGross * CLASSIC_NET_FACTOR;
    const hotelAnnualGross = rent * 12 * selectedType.mult * selectedZone.factor;
    const hotelAnnualNet = hotelAnnualGross * (1 - DEDUCTION);
    const extra = hotelAnnualNet - classicAnnualNet;
    const upliftPct = Math.round((extra / classicAnnualNet) * 100);
    return {
      classicAnnualNet,
      hotelAnnualGross,
      hotelAnnualNet,
      hotelMonthlyNet: hotelAnnualNet / 12,
      extra,
      upliftPct,
    };
  }, [rent, selectedType, selectedZone]);

  const t = isRo
    ? {
        badge: "Calculator ROI",
        title: "Estimator de venit: chirie clasică vs. regim hotelier",
        subtitle:
          "Alege tipul proprietății, zona din Timișoara și chiria clasică actuală. Îți arătăm instant diferența netă anuală.",
        typeLabel: "Tipul proprietății",
        zoneLabel: "Zona / proiectul din Timișoara",
        rentLabel: "Chiria clasică lunară (estimată sau actuală)",
        classic: "Chirie clasică — venit net anual",
        hotel: "Administrare RealTrust — venit net anual",
        gross: "Încasări brute estimate",
        monthly: "≈ net pe lună",
        extra: "Câștig suplimentar net pe an",
        uplift: "mai mult venit net",
        cta: "Solicită o evaluare exactă gratuită",
        assumptions: `Ipoteze: ocupare medie ${Math.round(OCCUPANCY * 100)}%, deducere standard ${Math.round(
          DEDUCTION * 100,
        )}% (comision de administrare, curățenie, consumabile, taxe). Cifrele sunt orientative; estimarea exactă se face după analiza proprietății.`,
      }
    : {
        badge: "ROI calculator",
        title: "Income estimator: long-term rent vs. short-stay management",
        subtitle:
          "Pick the property type, the Timișoara area and your current long-term rent. We show the net annual difference instantly.",
        typeLabel: "Property type",
        zoneLabel: "Area / project in Timișoara",
        rentLabel: "Monthly long-term rent (current or estimated)",
        classic: "Long-term rent — net annual income",
        hotel: "RealTrust management — net annual income",
        gross: "Estimated gross revenue",
        monthly: "≈ net per month",
        extra: "Extra net income per year",
        uplift: "more net income",
        cta: "Request a free exact valuation",
        assumptions: `Assumptions: ~${Math.round(OCCUPANCY * 100)}% average occupancy, standard ${Math.round(
          DEDUCTION * 100,
        )}% deduction (management fee, cleaning, consumables, taxes). Figures are indicative; the exact estimate follows a property review.`,
      };

  const ctaHref = `/evaluare-gratuita?tip=${typeKey}&zona=${selectedZone.slug}`;

  return (
    <section id="calculator-roi" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <Badge
              variant="outline"
              className="mb-4 px-4 py-2 text-sm font-medium border-primary/30 bg-primary/5"
            >
              <Calculator className="w-4 h-4 mr-2 text-primary" aria-hidden="true" />
              {t.badge}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">{t.title}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">{t.subtitle}</p>
          </div>

          <Card className="border-primary/20 shadow-lg">
            <CardContent className="p-6 md:p-8 grid gap-8 lg:grid-cols-2">
              {/* Inputs */}
              <div className="space-y-7">
                <div>
                  <Label className="mb-3 block text-sm font-semibold">{t.typeLabel}</Label>
                  <div className="grid grid-cols-3 gap-2" role="group" aria-label={t.typeLabel}>
                    {PROPERTY_TYPES.map((p) => (
                      <Button
                        key={p.key}
                        type="button"
                        variant={typeKey === p.key ? "default" : "outline"}
                        className="h-auto min-h-[48px] whitespace-normal text-xs md:text-sm"
                        aria-pressed={typeKey === p.key}
                        onClick={() => setTypeKey(p.key)}
                      >
                        {isRo ? p.ro : p.en}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="mb-3 block text-sm font-semibold">{t.zoneLabel}</Label>
                  <div className="grid grid-cols-2 gap-2" role="group" aria-label={t.zoneLabel}>
                    {ZONES.map((z) => (
                      <Button
                        key={z.key}
                        type="button"
                        variant={zoneKey === z.key ? "default" : "outline"}
                        className="h-auto min-h-[48px] whitespace-normal text-xs md:text-sm"
                        aria-pressed={zoneKey === z.key}
                        onClick={() => setZoneKey(z.key)}
                      >
                        {isRo ? z.ro : z.en}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-baseline justify-between mb-3">
                    <Label htmlFor="roi-rent" className="text-sm font-semibold">
                      {t.rentLabel}
                    </Label>
                    <span className="text-xl font-bold text-primary">{fmt(rent, isRo)}</span>
                  </div>
                  <Slider
                    id="roi-rent"
                    value={[rent]}
                    min={250}
                    max={1500}
                    step={25}
                    onValueChange={(v) => setRent(v[0])}
                    aria-label={t.rentLabel}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>250 €</span>
                    <span>1.500 €</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {[350, 500, 700].map((preset) => (
                      <Button
                        key={preset}
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => setRent(preset)}
                        aria-label={`${t.rentLabel}: ${preset} €`}
                      >
                        {preset} €
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Results */}
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-background p-5">
                  <p className="text-sm text-muted-foreground mb-1">{t.classic}</p>
                  <p className="text-2xl font-bold text-foreground">
                    {fmt(result.classicAnnualNet, isRo)}
                  </p>
                </div>

                <div className="rounded-xl border-2 border-primary/40 bg-primary/5 p-5">
                  <p className="text-sm text-muted-foreground mb-1">{t.hotel}</p>
                  <p className="text-3xl font-extrabold text-primary">
                    {fmt(result.hotelAnnualNet, isRo)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {fmt(result.hotelMonthlyNet, isRo)} {t.monthly} · {t.gross}:{" "}
                    {fmt(result.hotelAnnualGross, isRo)}
                  </p>
                </div>

                <div className="rounded-xl bg-foreground text-background p-5 flex items-center gap-4">
                  <TrendingUp className="w-8 h-8 shrink-0" aria-hidden="true" />
                  <div>
                    <p className="text-sm opacity-80">{t.extra}</p>
                    <p className="text-2xl font-bold">
                      {fmt(result.extra, isRo)}{" "}
                      <span className="text-base font-semibold">
                        (+{result.upliftPct}% {t.uplift})
                      </span>
                    </p>
                  </div>
                </div>

                <Button asChild size="lg" className="w-full min-h-[48px]">
                  <Link to={ctaHref}>
                    {t.cta}
                    <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
                  </Link>
                </Button>

                <p className="text-xs text-muted-foreground flex gap-2">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{t.assumptions}</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default OwnerRoiEstimator;
