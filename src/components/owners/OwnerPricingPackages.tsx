import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Check,
  MessageCircle,
  Info,
  Calculator,
  ClipboardCheck,
  Home,
  Banknote,
  ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { trackConversion } from "@/lib/conversionTracking";

/**
 * OwnerPricingPackages — prețuri și comisioane explicite pentru proprietari.
 * Fără taxe ascunse: comision unic din venitul brut, 0 € setup, servicii opționale la preț fix.
 * Componentă pur prezentațională, bilingvă RO/EN.
 */

const WHATSAPP_NUMBER = "40799069256";

const OwnerPricingPackages = () => {
  const { language } = useLanguage();
  const isRo = language === "ro";

  const t = isRo
    ? {
        badge: "Prețuri transparente",
        title: "Comisioane și pachete, fără costuri ascunse",
        subtitle:
          "Plătești un singur comision, calculat ca procent din venitul brut încasat. Dacă apartamentul nu produce, nu plătești nimic.",
        recommended: "Cel mai popular",
        commissionNote: "din venitul brut",
        commissionClarification:
          "Comisionul se aplică doar pe venitul generat de rezervări. Taxa de curățenie este plătită separat de oaspeți.",
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
        howTitle: "Cum funcționează",
        howSubtitle: "De la evaluare la primul venit pasiv, în 3 pași simpli.",
        steps: [
          {
            title: "Evaluare gratuită",
            description:
              "Analizăm apartamentul, zona și potențialul de randament. Primești o estimare realistă, fără obligații.",
          },
          {
            title: "Pregătire apartament",
            description:
              "Ne ocupăm de fotografii, listări, keybox, lenjerie și autorizări — tu doar aprobi planul.",
          },
          {
            title: "Încasare venit lunar pasiv",
            description:
              "Oaspeții vin, noi gestionăm tot, iar tu primești raportul lunar cu venitul net în cont.",
          },
        ],
        howCtaCalculator: "Calculează venit",
        howCtaWhatsapp: "Discută pe WhatsApp",
      }
    : {
        badge: "Transparent pricing",
        title: "Fees and packages, with no hidden costs",
        subtitle:
          "You pay a single fee, calculated as a percentage of the gross income collected. If the apartment earns nothing, you pay nothing.",
        recommended: "Most popular",
        commissionNote: "of gross income",
        commissionClarification:
          "The fee applies only to income generated by bookings. The cleaning fee is paid separately by guests.",
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
        howTitle: "How it works",
        howSubtitle: "From evaluation to first passive income, in 3 simple steps.",
        steps: [
          {
            title: "Free evaluation",
            description:
              "We analyse the apartment, area and yield potential. You get a realistic estimate with no obligation.",
          },
          {
            title: "Apartment setup",
            description:
              "We handle photos, listings, keybox, linen and licensing — you just approve the plan.",
          },
          {
            title: "Passive monthly income",
            description:
              "Guests arrive, we manage everything, and you receive a monthly report with net income in your account.",
          },
        ],
        howCtaCalculator: "Calculate income",
        howCtaWhatsapp: "Chat on WhatsApp",
      };

  const handlePackageWhatsApp = (packageName: string) => {
    trackConversion({
      event: "whatsapp_click",
      source: "owners_pricing_packages",
      value: packageName.includes("20%") || packageName.includes("Complet") ? 20 : undefined,
    });
  };

  const handleHowItWorksCalculator = () => {
    trackConversion({
      event: "roi_calculator_lead",
      source: "owners_pricing_how_it_works",
    });
  };

  const handleHowItWorksWhatsApp = () => {
    trackConversion({
      event: "whatsapp_click",
      source: "owners_pricing_how_it_works",
    });
  };

  const calculatorUrl =
    "/calculator-roi?utm_source=site&utm_medium=pricing_packages&utm_campaign=owners";

  const whatsappUrl = (extraContext = "") => {
    const message = isRo
      ? `Bună! Vreau detalii despre pachetele de administrare RealTrust.${extraContext} (sursa: site > pricing_packages > owners)`
      : `Hi! I'd like details about RealTrust management packages.${extraContext} (source: site > pricing_packages > owners)`;
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  };

  const stepIcons = [ClipboardCheck, Home, Banknote];

  return (
    <section id="pachete-administrare" className="py-16 md:py-20" aria-labelledby="owner-pricing-heading">
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
              className={`h-full relative ${
                p.best
                  ? "border-primary shadow-lg ring-1 ring-primary bg-primary/5"
                  : "border-border/60"
              }`}
            >
              {p.best && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  {t.recommended}
                </Badge>
              )}
              <CardContent className="p-6 flex flex-col h-full">
                <p className="font-semibold text-lg">{p.name}</p>
                <div className="mt-3 mb-1 flex items-baseline gap-2">
                  <span className={`text-4xl font-bold ${p.best ? "text-primary" : ""}`}>
                    {p.price}
                  </span>
                  <span className="text-sm text-muted-foreground">{t.commissionNote}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-5">{t.commissionClarification}</p>
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
                    href={whatsappUrl(` Mă interesează ${p.name}.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handlePackageWhatsApp(p.name)}
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
                <Link to={calculatorUrl} aria-label={t.ctaSecondary} onClick={handleHowItWorksCalculator}>
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

        {/* How it works + direct CTAs */}
        <div className="mt-16 md:mt-20 max-w-5xl mx-auto">
          <div className="text-center mb-10 md:mb-12">
            <Badge variant="secondary" className="mb-4">
              {isRo ? "Proces simplu" : "Simple process"}
            </Badge>
            <h3 className="text-2xl md:text-3xl font-bold mb-3">{t.howTitle}</h3>
            <p className="text-muted-foreground md:text-lg">{t.howSubtitle}</p>
          </div>

          <div className="relative grid gap-8 md:grid-cols-3">
            {t.steps.map((step, index) => {
              const Icon = stepIcons[index];
              return (
                <div key={step.title} className="relative">
                  {index < t.steps.length - 1 && (
                    <div
                      className="hidden md:block absolute top-8 left-[calc(66%+1rem)] w-[calc(100%-2rem)]"
                      aria-hidden="true"
                    >
                      <ArrowRight className="h-5 w-5 text-muted-foreground/40 absolute right-0 -translate-y-1/2" />
                      <div className="h-px bg-border absolute inset-x-0 top-0 -translate-y-1/2" />
                    </div>
                  )}
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-5">
                      <Icon className="h-7 w-7 text-primary" aria-hidden="true" />
                    </div>
                    <p className="text-sm font-semibold text-primary mb-2">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <h4 className="text-lg font-semibold mb-2">{step.title}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild variant="default" size="lg" className="min-h-[48px] w-full sm:w-auto">
              <Link
                to={calculatorUrl}
                aria-label={t.howCtaCalculator}
                onClick={handleHowItWorksCalculator}
              >
                <Calculator className="h-5 w-5 mr-2" aria-hidden="true" />
                {t.howCtaCalculator}
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="min-h-[48px] w-full sm:w-auto">
              <a
                href={whatsappUrl()}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t.howCtaWhatsapp}
                onClick={handleHowItWorksWhatsApp}
              >
                <MessageCircle className="h-5 w-5 mr-2" aria-hidden="true" />
                {t.howCtaWhatsapp}
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OwnerPricingPackages;
