import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, MessageCircle, Info, Calculator } from "lucide-react";
import { Link } from "react-router-dom";
import { trackConversion } from "@/lib/conversionTracking";

/**
 * OwnerPricingPackages — prețuri și comisioane explicite pentru proprietari.
 * Fără taxe ascunse: comision unic din venitul brut, 0 € setup, servicii opționale la preț fix.
 * Componentă pur prezentațională, bilingvă RO/EN.
 */

const WHATSAPP_URL =
  "https://wa.me/40799069256?text=" +
  encodeURIComponent("Bună! Vreau o ofertă de comision pentru apartamentul meu din Timișoara.");

const OwnerPricingPackages = () => {
  const { language } = useLanguage();
  const isRo = language === "ro";

  const t = isRo
    ? {
        badge: "Prețuri transparente",
        title: "Comisioane și pachete, fără costuri ascunse",
        subtitle:
          "Plătești un singur comision, calculat ca procent din venitul brut încasat. Dacă apartamentul nu produce, nu plătești nimic.",
        recommended: "Recomandat",
        commissionNote: "din venitul brut",
        includesLabel: "Include",
        packages: [
          {
            name: "Management Esențial",
            price: "15%",
            best: false,
            forWho: "Apartament deja amenajat și listat, vrei doar operarea zilnică.",
            features: [
              "Listare și sincronizare pe Booking + Airbnb",
              "Comunicare cu oaspeții și check-in coordonat",
              "Coordonare curățenie și lenjerie",
              "Raport lunar cu încasări și ocupare",
            ],
          },
          {
            name: "ApArt Hotel Complet",
            price: "20%",
            best: true,
            forWho: "Vrei randament maximizat, fără să te implici deloc.",
            features: [
              "Tot din Esențial, plus 12+ canale de distribuție",
              "Prețuri dinamice și optimizare conversie",
              "Standard hotelier: consumabile, lenjerie, control calitate",
              "Self check-in cu keybox și suport oaspeți 24/7",
              "Raport lunar detaliat + acces la dashboard",
            ],
          },
          {
            name: "Full Service Premium",
            price: "25%",
            best: false,
            forWho: "Apartament nou sau nemobilat, vrei totul la cheie.",
            features: [
              "Tot din ApArt Hotel Complet",
              "Amenajare și achiziții coordonate de noi",
              "Fotografii profesionale și tur virtual 360°",
              "Consultanță fiscală și autorizare regim hotelier",
              "Manager de cont dedicat",
            ],
          },
        ],
        zeroTitle: "Ce nu plătești niciodată",
        zeroItems: [
          "0 € taxă de setup sau înscriere",
          "0 € abonament lunar fix",
          "0 € penalizări la ieșirea din contract (preaviz 30 zile)",
          "0 € comision pe lunile fără rezervări",
        ],
        extrasTitle: "Servicii opționale, la preț fix",
        extras: [
          { label: "Fotografii profesionale (30 cadre editate)", value: "180 €, o singură dată" },
          { label: "Tur virtual 360° și plan 2D", value: "240 €, o singură dată" },
          { label: "Pachet amenajare (design + achiziții)", value: "de la 450 €, o singură dată" },
          { label: "Autorizare și clasificare regim hotelier", value: "290 €, o singură dată" },
          { label: "Consultanță fiscală (structură optimă)", value: "Gratuit pentru clienții de management" },
        ],
        minTitle: "Condiții minime de colaborare",
        minItems: [
          "Apartament în Timișoara sau Dumbrăvița, cu acte în regulă",
          "Minim 1 dormitor separat și utilități funcționale",
          "Acordul asociației de proprietari, dacă regulamentul îl cere",
        ],
        ctaPrimary: "Cere oferta pentru apartamentul meu",
        ctaSecondary: "Estimează venitul net",
        note:
          "Comisionul se aplică la venitul brut din rezervări și include TVA-ul serviciilor noastre. Curățenia între rezervări este facturată separat, la costul real (25–40 € / schimb, în funcție de suprafață).",
      }
    : {
        badge: "Transparent pricing",
        title: "Fees and packages, with no hidden costs",
        subtitle:
          "You pay a single fee, calculated as a percentage of the gross income collected. If the apartment earns nothing, you pay nothing.",
        recommended: "Recommended",
        commissionNote: "of gross income",
        includesLabel: "Includes",
        packages: [
          {
            name: "Essential Management",
            price: "15%",
            best: false,
            forWho: "Apartment already furnished and listed, you only need daily operations.",
            features: [
              "Listing and sync on Booking + Airbnb",
              "Guest communication and coordinated check-in",
              "Cleaning and linen coordination",
              "Monthly report with income and occupancy",
            ],
          },
          {
            name: "Complete ApArt Hotel",
            price: "20%",
            best: true,
            forWho: "You want maximised returns with zero involvement.",
            features: [
              "Everything in Essential, plus 12+ distribution channels",
              "Dynamic pricing and conversion optimisation",
              "Hotel standard: consumables, linen, quality control",
              "Self check-in keybox and 24/7 guest support",
              "Detailed monthly report + dashboard access",
            ],
          },
          {
            name: "Full Service Premium",
            price: "25%",
            best: false,
            forWho: "New or unfurnished apartment, you want a turnkey solution.",
            features: [
              "Everything in Complete ApArt Hotel",
              "Interior setup and purchasing handled by us",
              "Professional photography and 360° virtual tour",
              "Tax advisory and short-term rental licensing",
              "Dedicated account manager",
            ],
          },
        ],
        zeroTitle: "What you never pay",
        zeroItems: [
          "€0 setup or onboarding fee",
          "€0 fixed monthly subscription",
          "€0 exit penalties (30 days' notice)",
          "€0 fee for months without bookings",
        ],
        extrasTitle: "Optional services, fixed price",
        extras: [
          { label: "Professional photography (30 edited shots)", value: "€180, one-off" },
          { label: "360° virtual tour and 2D floor plan", value: "€240, one-off" },
          { label: "Interior setup package (design + purchasing)", value: "from €450, one-off" },
          { label: "Short-term rental licensing and classification", value: "€290, one-off" },
          { label: "Tax advisory (optimal structure)", value: "Free for management clients" },
        ],
        minTitle: "Minimum requirements",
        minItems: [
          "Apartment in Timișoara or Dumbrăvița, with clear ownership documents",
          "At least one separate bedroom and working utilities",
          "Owners' association approval, where the rules require it",
        ],
        ctaPrimary: "Request a quote for my apartment",
        ctaSecondary: "Estimate my net income",
        note:
          "The fee applies to gross booking income and includes VAT on our services. Turnover cleaning is invoiced separately at cost (€25–40 per changeover, depending on size).",
      };

  const handleWhatsApp = () => {
    trackConversion({ event: "whatsapp_click", source: "owners_pricing_packages" });
  };

  return (
    <section className="py-16 md:py-20" aria-labelledby="owner-pricing-heading">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-10 md:mb-12">
          <Badge variant="secondary" className="mb-4">
            {t.badge}
          </Badge>
          <h2 id="owner-pricing-heading" className="text-2xl md:text-4xl font-bold mb-4">
            {t.title}
          </h2>
          <p className="text-muted-foreground md:text-lg">{t.subtitle}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {t.packages.map((p) => (
            <Card
              key={p.name}
              className={`h-full relative ${p.best ? "border-primary shadow-lg" : "border-border/60"}`}
            >
              {p.best && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">{t.recommended}</Badge>
              )}
              <CardContent className="p-6 flex flex-col h-full">
                <p className="font-semibold text-lg">{p.name}</p>
                <div className="mt-3 mb-2 flex items-baseline gap-2">
                  <span className={`text-4xl font-bold ${p.best ? "text-primary" : ""}`}>{p.price}</span>
                  <span className="text-sm text-muted-foreground">{t.commissionNote}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-5">{p.forWho}</p>

                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                  {t.includesLabel}
                </p>
                <ul className="space-y-2 text-sm flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" aria-hidden="true" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  variant={p.best ? "default" : "outline"}
                  className="mt-6 min-h-[48px]"
                >
                  <a
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleWhatsApp}
                    aria-label={`${t.ctaPrimary} — ${p.name}`}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                    {t.ctaPrimary}
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2 mt-8">
          <Card className="border-border/60">
            <CardContent className="p-6">
              <p className="font-semibold mb-4">{t.zeroTitle}</p>
              <ul className="space-y-2 text-sm">
                {t.zeroItems.map((z) => (
                  <li key={z} className="flex gap-2">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" aria-hidden="true" />
                    <span className="text-muted-foreground">{z}</span>
                  </li>
                ))}
              </ul>
              <p className="font-semibold mt-6 mb-3">{t.minTitle}</p>
              <ul className="space-y-2 text-sm">
                {t.minItems.map((m) => (
                  <li key={m} className="text-muted-foreground">
                    • {m}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="p-6">
              <p className="font-semibold mb-4">{t.extrasTitle}</p>
              <ul className="divide-y divide-border/60">
                {t.extras.map((e) => (
                  <li key={e.label} className="py-3 flex justify-between gap-4 text-sm first:pt-0">
                    <span className="text-muted-foreground">{e.label}</span>
                    <span className="font-medium whitespace-nowrap">{e.value}</span>
                  </li>
                ))}
              </ul>
              <Button asChild variant="outline" className="mt-5 w-full min-h-[48px]">
                <Link to="/calculator-roi" aria-label={t.ctaSecondary}>
                  <Calculator className="h-4 w-4 mr-2" aria-hidden="true" />
                  {t.ctaSecondary}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <p className="mt-6 text-xs text-muted-foreground max-w-3xl mx-auto flex gap-2 justify-center text-center">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{t.note}</span>
        </p>
      </div>
    </section>
  );
};

export default OwnerPricingPackages;
