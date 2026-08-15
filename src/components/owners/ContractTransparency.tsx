import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, ShieldCheck, CalendarClock, XCircle, Wallet, ArrowRight, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { trackConversion } from "@/lib/conversionTracking";

/**
 * ContractTransparency — răspunde la frica #1 a proprietarilor: "ce semnez și cum ies?".
 * Afișează termenii cheie ai contractului + un model de raport lunar (exemplu ilustrativ).
 * Pur prezentațional, bilingv RO/EN, fără backend.
 */
const WHATSAPP_URL =
  "https://wa.me/40726123456?text=" +
  encodeURIComponent("Bună! Vreau modelul de contract de administrare și un exemplu de raport lunar.");

const ContractTransparency = () => {
  const { language } = useLanguage();
  const isRo = language === "ro";

  const t = isRo
    ? {
        badge: "Transparență contractuală",
        title: "Ce semnezi și ce primești în fiecare lună",
        subtitle:
          "Fără clauze ascunse și fără blocaje pe termen lung. Îți arătăm termenii înainte să discutăm despre apartamentul tău.",
        termsTitle: "Termenii cheie ai contractului",
        terms: [
          { icon: CalendarClock, label: "Durată", value: "12 luni, cu reînnoire automată doar cu acordul tău" },
          { icon: XCircle, label: "Ieșire din contract", value: "Preaviz 30 de zile, fără penalizări" },
          { icon: Wallet, label: "Comision", value: "Unic, procent din venitul brut (15%–25%, în funcție de pachet)" },
          { icon: ShieldCheck, label: "Fără taxe ascunse", value: "0 € setup, 0 € abonament, 0 € la retragere" },
        ],
        whoPaysTitle: "Cine plătește ce",
        weCover: [
          "Listare și optimizare pe Booking, Airbnb și 10+ canale",
          "Check-in / check-out, comunicarea cu oaspeții 24/7",
          "Curățenie profesională și lenjerie între rezervări",
          "Prețuri dinamice, fotografii și raportare lunară",
        ],
        youCover: [
          "Utilități și întreținere (asociație, curent, apă, internet)",
          "Reparații majore și înlocuirea obiectelor de inventar",
          "Impozitele pe venitul obținut (te ajutăm cu structura fiscală)",
        ],
        reportTitle: "Model de raport lunar",
        reportNote:
          "Exemplu ilustrativ pentru un apartament cu 2 camere în Centru, la ocupare 75%. Primești același format, cu cifrele tale reale, în primele 5 zile ale lunii.",
        rows: [
          { label: "Venit brut din rezervări", value: "1.800 €", tone: "pos" },
          { label: "Comision administrare (20%)", value: "− 360 €", tone: "neg" },
          { label: "Curățenie și consumabile", value: "− 180 €", tone: "neg" },
          { label: "Utilități și asociație", value: "− 130 €", tone: "neg" },
        ],
        netLabel: "Încasare netă proprietar",
        netValue: "1.130 €",
        extras: "Raportul include și: nopți vândute, tarif mediu pe noapte, ocupare, recenzii primite și lista rezervărilor.",
        ctaPrimary: "Cere modelul de contract",
        ctaSecondary: "Vezi pachetele și comisioanele",
      }
    : {
        badge: "Contract transparency",
        title: "What you sign and what you receive every month",
        subtitle:
          "No hidden clauses, no long lock-in. We show you the terms before we even discuss your apartment.",
        termsTitle: "Key contract terms",
        terms: [
          { icon: CalendarClock, label: "Term", value: "12 months, renewed only with your agreement" },
          { icon: XCircle, label: "Exit", value: "30 days notice, no penalties" },
          { icon: Wallet, label: "Commission", value: "Single fee, % of gross revenue (15%–25% by package)" },
          { icon: ShieldCheck, label: "No hidden fees", value: "€0 setup, €0 subscription, €0 exit fee" },
        ],
        whoPaysTitle: "Who pays what",
        weCover: [
          "Listing and optimisation on Booking, Airbnb and 10+ channels",
          "Check-in / check-out and 24/7 guest communication",
          "Professional cleaning and linen between stays",
          "Dynamic pricing, photography and monthly reporting",
        ],
        youCover: [
          "Utilities and building costs (electricity, water, internet)",
          "Major repairs and replacement of inventory items",
          "Taxes on the income earned (we help with the tax structure)",
        ],
        reportTitle: "Sample monthly report",
        reportNote:
          "Illustrative example for a 2-room apartment in the city centre at 75% occupancy. You receive the same format with your real numbers in the first 5 days of each month.",
        rows: [
          { label: "Gross booking revenue", value: "€1,800", tone: "pos" },
          { label: "Management commission (20%)", value: "− €360", tone: "neg" },
          { label: "Cleaning and consumables", value: "− €180", tone: "neg" },
          { label: "Utilities and building costs", value: "− €130", tone: "neg" },
        ],
        netLabel: "Net owner payout",
        netValue: "€1,130",
        extras: "The report also includes nights sold, average nightly rate, occupancy, reviews received and the booking list.",
        ctaPrimary: "Request the contract template",
        ctaSecondary: "See packages and commissions",
      };

  const handleContractRequest = () => {
    trackConversion("contract_template_request", { source: "owners_contract_transparency" });
  };

  return (
    <section className="py-16 md:py-20 bg-muted/30" aria-labelledby="contract-transparency-title">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-10 md:mb-14">
          <Badge variant="secondary" className="mb-4">
            <FileText className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
            {t.badge}
          </Badge>
          <h2 id="contract-transparency-title" className="text-2xl md:text-4xl font-bold mb-4">
            {t.title}
          </h2>
          <p className="text-muted-foreground text-base md:text-lg">{t.subtitle}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 max-w-6xl mx-auto">
          {/* Contract terms */}
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">{t.termsTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <ul className="space-y-4">
                {t.terms.map((term) => {
                  const Icon = term.icon;
                  return (
                    <li key={term.label} className="flex gap-3">
                      <span className="mt-0.5 shrink-0 rounded-md bg-primary/10 p-2">
                        <Icon className="w-4 h-4 text-primary" aria-hidden="true" />
                      </span>
                      <span>
                        <span className="block font-semibold text-sm">{term.label}</span>
                        <span className="block text-sm text-muted-foreground">{term.value}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>

              <div className="pt-2 border-t border-border/60">
                <h3 className="font-semibold text-sm mb-3">{t.whoPaysTitle}</h3>
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-primary mb-2">RealTrust</p>
                    <ul className="space-y-1.5 text-muted-foreground">
                      {t.weCover.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium mb-2">{isRo ? "Proprietar" : "Owner"}</p>
                    <ul className="space-y-1.5 text-muted-foreground">
                      {t.youCover.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sample monthly report */}
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">{t.reportTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="divide-y divide-border/60 rounded-lg border border-border/60 overflow-hidden">
                {t.rows.map((row) => (
                  <div key={row.label} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                    <dt className="text-muted-foreground">{row.label}</dt>
                    <dd className={row.tone === "neg" ? "font-semibold text-destructive" : "font-semibold"}>
                      {row.value}
                    </dd>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-4 px-4 py-4 bg-primary/10">
                  <dt className="font-semibold">{t.netLabel}</dt>
                  <dd className="text-lg font-bold text-primary">{t.netValue}</dd>
                </div>
              </dl>

              <p className="text-xs text-muted-foreground">{t.extras}</p>
              <p className="text-xs text-muted-foreground italic">{t.reportNote}</p>

              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <Button asChild className="flex-1" onClick={handleContractRequest}>
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
                  <Link to="/preturi" aria-label={t.ctaSecondary}>
                    {t.ctaSecondary}
                    <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default ContractTransparency;
