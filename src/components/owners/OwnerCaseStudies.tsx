import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Building2, Home, Briefcase, Target, CheckCircle2 } from "lucide-react";

/**
 * OwnerCaseStudies — trei scenarii reprezentative din portofoliul administrat de Adrian Costi.
 * Cifrele sunt medii nete lunare (după comision, curățenie, utilități), la ocupare ~75%.
 * Fără fotografii de stock (politica de autenticitate): dovezile se trimit la cerere.
 */

const OwnerCaseStudies = () => {
  const { language } = useLanguage();
  const isRo = language === "ro";

  const t = isRo
    ? {
        badge: "Studii de caz",
        title: "Trei scenarii reale din portofoliul administrat",
        subtitle:
          "Cifre nete lunare, strategia aplicată și obiectivul atins — pentru apartamente pe care le administrăm în Timișoara.",
        traditional: "Randament tradițional",
        realtrust: "Randament RealTrust",
        execution: "Sumar de execuție",
        objective: "Obiectiv atins",
        cta: "Vreau o analiză pentru proprietatea mea",
        note:
          "Cifrele sunt medii nete lunare, la un grad de ocupare de ~75%, după comision de administrare, curățenie și utilități. Documentele și rapoartele reale se pot verifica într-un call de 15 minute.",
        cases: [
          {
            icon: Home,
            label: "Garsonieră / Studio",
            zone: "Circumvalațiunii / ISHO",
            title: "Studio convertit în regim hotelier",
            before: "330 €/lună",
            after: "760 €/lună",
            metric: "Ocupare 78%",
            execution:
              "Conversie completă în regim hotelier: pat dublu real + canapea extensibilă, kit de bucătărie, self check-in cu keybox, fotografii profesionale și listare pe 12 canale cu titluri optimizate.",
            objective:
              "Venit net lunar dublat față de chiria clasică, fără perioade de gol între chiriași.",
          },
          {
            icon: Building2,
            label: "2 camere premium",
            zone: "Fructus Plaza / Paltim / City of Mara",
            title: "Apartament premium pe dynamic pricing",
            before: "480 €/lună",
            after: "1.130 €/lună",
            metric: "9,4% randament net",
            execution:
              "Prețuri dinamice ajustate zilnic pe cerere, evenimente și sezonalitate; targetare business + city-break; verificare oaspeți, garanție de daune și mentenanță preventivă trimestrială.",
            objective:
              "Randament net de până la 9,4% pe an și protecția activului pe termen lung (apartament predat în aceeași stare).",
          },
          {
            icon: Briefcase,
            label: "Portofoliu / servicii complete",
            zone: "Proprietar delegat 100%",
            title: "Zero efort: administrare completă delegată",
            before: "12–15 h/lună de proprietar",
            after: "0 h/lună de proprietar",
            metric: "100% administrare",
            execution:
              "Preluăm integral operarea: comunicare cu oaspeții 7 zile/săptămână, check-in/check-out, curățenie profesională, lenjerie, consumabile, mentenanță și raport financiar lunar.",
            objective:
              "Proprietarul nu mai gestionează nimic operațional și primește un singur raport clar, lunar, cu încasări și cheltuieli.",
          },
        ],
      }
    : {
        badge: "Case studies",
        title: "Three real scenarios from the managed portfolio",
        subtitle:
          "Net monthly figures, the strategy applied and the outcome achieved — for apartments we manage in Timișoara.",
        traditional: "Traditional yield",
        realtrust: "RealTrust yield",
        execution: "Execution summary",
        objective: "Outcome achieved",
        cta: "Request an analysis for my property",
        note:
          "Figures are net monthly averages at ~75% occupancy, after management fee, cleaning and utilities. Real documents and reports can be reviewed in a 15-minute call.",
        cases: [
          {
            icon: Home,
            label: "Studio",
            zone: "Circumvalațiunii / ISHO",
            title: "Studio converted to short-stay operation",
            before: "€330/month",
            after: "€760/month",
            metric: "78% occupancy",
            execution:
              "Full conversion to hotel-style operation: real double bed plus sofa bed, complete kitchen kit, self check-in with keybox, professional photos and listings on 12 channels with optimised titles.",
            objective:
              "Net monthly income doubled versus a classic long-term rent, with no vacancy gaps between tenants.",
          },
          {
            icon: Building2,
            label: "Premium 2-bedroom",
            zone: "Fructus Plaza / Paltim / City of Mara",
            title: "Premium apartment on dynamic pricing",
            before: "€480/month",
            after: "€1,130/month",
            metric: "9.4% net yield",
            execution:
              "Daily dynamic pricing driven by demand, events and seasonality; business plus city-break targeting; guest screening, damage deposit and quarterly preventive maintenance.",
            objective:
              "Net yield of up to 9.4% per year plus long-term asset protection (the apartment is returned in the same condition).",
          },
          {
            icon: Briefcase,
            label: "Portfolio / full service",
            zone: "100% delegated owner",
            title: "Zero effort: fully delegated management",
            before: "12–15 owner hours/month",
            after: "0 owner hours/month",
            metric: "100% managed",
            execution:
              "We take over the entire operation: 7-day guest communication, check-in/check-out, professional cleaning, linen, consumables, maintenance and a monthly financial report.",
            objective:
              "The owner handles nothing operational and receives one clear monthly report with income and expenses.",
          },
        ],
      };

  return (
    <section className="py-16 md:py-20 bg-background" aria-labelledby="owner-case-studies-title">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-10 md:mb-14">
          <Badge variant="outline" className="mb-4">
            {t.badge}
          </Badge>
          <h2
            id="owner-case-studies-title"
            className="text-3xl md:text-4xl font-bold mb-4 text-foreground"
          >
            {t.title}
          </h2>
          <p className="text-muted-foreground text-lg">{t.subtitle}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {t.cases.map((c) => {
            const Icon = c.icon;
            return (
              <Card
                key={c.title}
                className="h-full border-border/60 transition-shadow hover:shadow-lg focus-within:shadow-lg"
              >
                <CardContent className="p-6 flex flex-col h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                        {c.label}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">{c.zone}</p>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-foreground mb-4">{c.title}</h3>

                  <div className="rounded-xl bg-primary/5 border border-primary/10 p-4 mb-4">
                    <div className="grid grid-cols-2 gap-3 items-end">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                          {t.traditional}
                        </p>
                        <p className="text-lg font-semibold text-muted-foreground line-through decoration-muted-foreground/50">
                          {c.before}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-primary mb-1">
                          {t.realtrust}
                        </p>
                        <p className="text-2xl font-extrabold text-primary leading-tight">
                          {c.after}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs font-semibold text-foreground">{c.metric}</p>
                  </div>

                  <div className="mb-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                      {t.execution}
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{c.execution}</p>
                  </div>

                  <div className="mt-auto flex items-start gap-2 rounded-lg bg-muted/50 p-3">
                    <Target className="h-4 w-4 text-primary mt-0.5 shrink-0" aria-hidden="true" />
                    <div>
                      <p className="text-xs font-semibold text-foreground mb-0.5">{t.objective}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">{c.objective}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-10 max-w-3xl mx-auto text-center">
          <p className="text-xs text-muted-foreground mb-5 flex items-start gap-2 text-left sm:text-center sm:justify-center">
            <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" aria-hidden="true" />
            <span>{t.note}</span>
          </p>
          <Button asChild size="lg" className="min-h-[48px]">
            <Link to="/evaluare-gratuita">
              {t.cta}
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default OwnerCaseStudies;
