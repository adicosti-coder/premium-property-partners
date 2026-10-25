import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, MessageCircle, Camera, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { trackConversion } from "@/lib/conversionTracking";

/**
 * BeforeAfterTransformations — arată impactul trecerii de la chirie clasică la regim hotelier,
 * pe apartamente reale administrate de RealTrust în Timișoara.
 * Cifrele sunt medii lunare nete (după comision, curățenie și utilități), la ocupare 75%.
 * Fără fotografii de stock: pozele reale se trimit la cerere (politica de autenticitate).
 */

interface CaseItem {
  zone: string;
  rooms: string;
  beforeLabel: string;
  before: string;
  afterLabel: string;
  after: string;
  upliftPct: number;
  work: string;
  timeline: string;
}

const WHATSAPP_URL =
  "https://wa.me/40799069256?text=" +
  encodeURIComponent(
    "Bună! Vreau să văd pozele înainte/după și cifrele reale pentru un apartament similar cu al meu."
  );

const BeforeAfterTransformations = () => {
  const { language } = useLanguage();
  const isRo = language === "ro";

  const t = isRo
    ? {
        badge: "Înainte / După",
        title: "Ce se schimbă concret după trecerea în regim hotelier",
        subtitle:
          "Apartamente administrate de noi în Timișoara: venit net lunar înainte (chirie clasică) și după (regim hotelier), plus intervenția care a făcut diferența.",
        beforeLabel: "Chirie clasică (net/lună)",
        afterLabel: "Regim hotelier (net/lună)",
        workLabel: "Ce am schimbat",
        timelineLabel: "Timp până la primul venit",
        uplift: "creștere venit net",
        cases: [
          {
            zone: "Centru / Cetate",
            rooms: "2 camere, 54 m²",
            beforeLabel: "Chirie clasică (net/lună)",
            before: "480 €",
            afterLabel: "Regim hotelier (net/lună)",
            after: "1.130 €",
            upliftPct: 135,
            work: "Reamenajare ușoară (textile, iluminat, zonă de lucru), fotografii profesionale, listare pe 12 canale, prețuri dinamice.",
            timeline: "9 zile",
          },
          {
            zone: "Iosefin",
            rooms: "1 cameră, 38 m²",
            beforeLabel: "Chirie clasică (net/lună)",
            before: "330 €",
            afterLabel: "Regim hotelier (net/lună)",
            after: "760 €",
            upliftPct: 130,
            work: "Canapea extensibilă + pat dublu real, kit de bucătărie complet, self check-in cu keybox, optimizare titluri și descrieri.",
            timeline: "7 zile",
          },
          {
            zone: "Dumbrăvița",
            rooms: "3 camere, 78 m²",
            beforeLabel: "Chirie clasică (net/lună)",
            before: "600 €",
            afterLabel: "Regim hotelier (net/lună)",
            after: "1.420 €",
            upliftPct: 137,
            work: "Reconfigurare pe 6 locuri de dormit, parcare inclusă în anunț, targetare familii și grupuri de business, tur virtual 360°.",
            timeline: "12 zile",
          },
        ] as CaseItem[],
        photoTitle: "Pozele înainte/după, la cerere",
        photoBody:
          "Nu publicăm fotografii de stock. Îți trimitem pe WhatsApp seturile reale înainte/după, cu acordul proprietarilor, plus rapoartele lunare corespunzătoare.",
        note:
          "Cifre medii pe 12 luni, la ocupare 75%, după comisionul de administrare, curățenie și utilități. Rezultatele variază în funcție de apartament, dotări și sezon.",
        ctaPrimary: "Vreau pozele și cifrele reale",
        ctaSecondary: "Calculează venitul apartamentului meu",
      }
    : {
        badge: "Before / After",
        title: "What actually changes after switching to short-term rental",
        subtitle:
          "Apartments we manage in Timișoara: net monthly income before (long-term rent) and after (short-term rental), plus the work that made the difference.",
        beforeLabel: "Long-term rent (net/month)",
        afterLabel: "Short-term rental (net/month)",
        workLabel: "What we changed",
        timelineLabel: "Time to first income",
        uplift: "net income increase",
        cases: [
          {
            zone: "City Centre",
            rooms: "2 rooms, 54 m²",
            beforeLabel: "Long-term rent (net/month)",
            before: "€480",
            afterLabel: "Short-term rental (net/month)",
            after: "€1,130",
            upliftPct: 135,
            work: "Light restyling (textiles, lighting, work corner), professional photos, listing on 12 channels, dynamic pricing.",
            timeline: "9 days",
          },
          {
            zone: "Iosefin",
            rooms: "1 room, 38 m²",
            beforeLabel: "Long-term rent (net/month)",
            before: "€330",
            afterLabel: "Short-term rental (net/month)",
            after: "€760",
            upliftPct: 130,
            work: "Sofa bed plus a real double bed, full kitchen kit, self check-in keybox, optimised titles and descriptions.",
            timeline: "7 days",
          },
          {
            zone: "Dumbrăvița",
            rooms: "3 rooms, 78 m²",
            beforeLabel: "Long-term rent (net/month)",
            before: "€600",
            afterLabel: "Short-term rental (net/month)",
            after: "€1,420",
            upliftPct: 137,
            work: "Reconfigured for 6 sleeping places, parking highlighted, targeting families and business groups, 360° virtual tour.",
            timeline: "12 days",
          },
        ] as CaseItem[],
        photoTitle: "Before/after photos on request",
        photoBody:
          "We never publish stock photography. We send you the real before/after sets on WhatsApp, with the owners' consent, together with the matching monthly reports.",
        note:
          "12-month averages at 75% occupancy, after management fee, cleaning and utilities. Results vary by apartment, amenities and season.",
        ctaPrimary: "Send me the photos and real figures",
        ctaSecondary: "Calculate my apartment's income",
      };

  const handleWhatsApp = () => {
    trackConversion({ event: "whatsapp_click", source: "owners_before_after" });
  };

  return (
    <section className="py-16 md:py-20 bg-muted/30" aria-labelledby="before-after-heading">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-10 md:mb-12">
          <Badge variant="secondary" className="mb-4">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
            {t.badge}
          </Badge>
          <h2 id="before-after-heading" className="text-2xl md:text-4xl font-bold mb-4">
            {t.title}
          </h2>
          <p className="text-muted-foreground md:text-lg">{t.subtitle}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {t.cases.map((c) => (
            <Card key={c.zone} className="h-full border-border/60">
              <CardContent className="p-6 space-y-5">
                <div>
                  <p className="font-semibold text-lg">{c.zone}</p>
                  <p className="text-sm text-muted-foreground">{c.rooms}</p>
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <div className="rounded-lg border border-border/60 p-3 text-center">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                      {t.beforeLabel}
                    </p>
                    <p className="text-xl font-bold text-muted-foreground">{c.before}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-primary" aria-hidden="true" />
                  <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 text-center">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                      {t.afterLabel}
                    </p>
                    <p className="text-xl font-bold text-primary">{c.after}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <TrendingUp className="h-4 w-4" aria-hidden="true" />
                  +{c.upliftPct}% {t.uplift}
                </div>

                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-medium mb-1">{t.workLabel}</p>
                    <p className="text-muted-foreground">{c.work}</p>
                  </div>
                  <div>
                    <p className="font-medium mb-1">{t.timelineLabel}</p>
                    <p className="text-muted-foreground">{c.timeline}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-8 border-dashed">
          <CardContent className="p-6 flex flex-col md:flex-row md:items-center gap-5">
            <div className="flex items-start gap-3 flex-1">
              <Camera className="h-5 w-5 text-primary mt-0.5 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold mb-1">{t.photoTitle}</p>
                <p className="text-sm text-muted-foreground">{t.photoBody}</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 md:shrink-0">
              <Button asChild size="lg" className="min-h-[48px]">
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleWhatsApp}
                  aria-label={t.ctaPrimary}
                >
                  <MessageCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                  {t.ctaPrimary}
                </a>
              </Button>
              <Button asChild variant="outline" size="lg" className="min-h-[48px]">
                <Link to="/calculator-randament" aria-label={t.ctaSecondary}>
                  {t.ctaSecondary}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="mt-6 text-xs text-muted-foreground text-center max-w-3xl mx-auto">{t.note}</p>
      </div>
    </section>
  );
};

export default BeforeAfterTransformations;
