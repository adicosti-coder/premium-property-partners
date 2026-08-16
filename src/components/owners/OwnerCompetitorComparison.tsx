import { useLanguage } from "@/i18n/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Minus, X, Scale, MessageCircle, ArrowRight, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { trackConversion } from "@/lib/conversionTracking";

/**
 * OwnerCompetitorComparison — comparație onestă între cele trei variante reale
 * pe care le are un proprietar din Timișoara: RealTrust, self-management pe
 * Airbnb/Booking și o agenție clasică de administrare.
 * Pur prezentațional, bilingv RO/EN, fără backend.
 */
const WHATSAPP_URL =
  "https://wa.me/40799069256?text=" +
  encodeURIComponent(
    "Bună! Am comparat variantele de administrare și vreau detalii despre oferta RealTrust.",
  );

type Mark = "yes" | "no" | "partial";
type Cell = { text: string; mark?: Mark };
type Row = { label: string; hint?: string; realtrust: Cell; diy: Cell; agency: Cell };

const MarkIcon = ({ mark }: { mark?: Mark }) => {
  if (mark === "yes")
    return <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />;
  if (mark === "no")
    return <X className="w-4 h-4 text-destructive shrink-0 mt-0.5" aria-hidden="true" />;
  if (mark === "partial")
    return <Minus className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" aria-hidden="true" />;
  return null;
};

const OwnerCompetitorComparison = () => {
  const { language } = useLanguage();
  const isRo = language === "ro";

  const t = isRo
    ? {
        badge: "Comparație onestă",
        title: "RealTrust vs. te descurci singur vs. agenție clasică",
        subtitle:
          "Trei variante reale, aceleași criterii. Îți arătăm și unde alternativele sunt mai bune decât noi.",
        colRealtrust: "RealTrust",
        colRealtrustSub: "Regim hotelier administrat",
        colDiy: "Singur pe Airbnb/Booking",
        colDiySub: "Tu faci tot",
        colAgency: "Agenție clasică",
        colAgencySub: "Chirie lungă / intermediere",
        recommended: "Recomandat",
        rows: [
          {
            label: "Comision / cost",
            realtrust: { text: "15–25% din încasările nete, fără abonament", mark: "yes" },
            diy: { text: "0% comision propriu, dar 3–17% taxe platformă", mark: "yes" },
            agency: { text: "Ex. 1 chirie la intermediere sau 8–10% administrare", mark: "partial" },
          },
          {
            label: "Timpul tău lunar",
            realtrust: { text: "~30 min: aprobi cheltuieli, citești raportul", mark: "yes" },
            diy: { text: "20–40 ore: mesaje, check-in, curățenie, prețuri", mark: "no" },
            agency: { text: "1–2 ore: doar la incidente și reînnoiri", mark: "yes" },
          },
          {
            label: "Venit net estimat (2 camere, Cetate)",
            hint: "Estimare orientativă, pe baza mediei anuale de 75% ocupare.",
            realtrust: { text: "~1.100–1.400 €/lună net", mark: "yes" },
            diy: { text: "~900–1.200 €/lună, dar variază cu experiența", mark: "partial" },
            agency: { text: "~550–750 €/lună (chirie clasică)", mark: "no" },
          },
          {
            label: "Ocupare medie realizată",
            realtrust: { text: "~75% pe an, tarife ajustate zilnic", mark: "yes" },
            diy: { text: "45–65% tipic în primul an, fără pricing dinamic", mark: "partial" },
            agency: { text: "100% ocupat, dar la tarif fix mult mai mic", mark: "partial" },
          },
          {
            label: "Cine răspunde oaspeților",
            realtrust: { text: "Echipa noastră, inclusiv seara și în weekend", mark: "yes" },
            diy: { text: "Tu, la orice oră — inclusiv în concediu", mark: "no" },
            agency: { text: "Nu se aplică (chiriaș pe termen lung)", mark: "partial" },
          },
          {
            label: "Curățenie, lenjerie, consumabile",
            realtrust: { text: "Incluse, echipă proprie, verificare la fiecare plecare", mark: "yes" },
            diy: { text: "Le organizezi și le plătești separat", mark: "no" },
            agency: { text: "Nu sunt incluse", mark: "no" },
          },
          {
            label: "Foto profesional și texte anunț",
            realtrust: { text: "Incluse, fără cost inițial", mark: "yes" },
            diy: { text: "300–600 € investiție proprie", mark: "no" },
            agency: { text: "De obicei foto simplu, făcut pe telefon", mark: "partial" },
          },
          {
            label: "Daune produse de oaspeți",
            realtrust: { text: "Acoperire pe 3 niveluri, sub 150 € suportăm noi", mark: "yes" },
            diy: { text: "Tu deschizi reclamația și suporți diferența", mark: "no" },
            agency: { text: "Garanția chiriașului, dacă mai există la final", mark: "partial" },
          },
          {
            label: "Raportare și transparență",
            realtrust: { text: "Portal proprietar + raport lunar PDF, plată până în data 10", mark: "yes" },
            diy: { text: "Îți faci propriul Excel", mark: "partial" },
            agency: { text: "De regulă doar contractul și chitanțele", mark: "partial" },
          },
          {
            label: "Ieșire din colaborare",
            realtrust: { text: "Probă 90 zile, apoi preaviz 30 zile, 0 € taxe", mark: "yes" },
            diy: { text: "Oprești oricând (dar pierzi scorul construit)", mark: "yes" },
            agency: { text: "Legat de durata contractului de închiriere", mark: "partial" },
          },
          {
            label: "Uzura apartamentului",
            realtrust: { text: "Mai multă rotație, dar verificare și intervenție la fiecare plecare", mark: "partial" },
            diy: { text: "Aceeași rotație, control mai slab", mark: "partial" },
            agency: { text: "Un singur chiriaș — cea mai mică uzură", mark: "yes" },
          },
          {
            label: "Predictibilitate lunară",
            realtrust: { text: "Variază cu sezonul (vezi graficul de sezonalitate)", mark: "partial" },
            diy: { text: "Cea mai mare variație, depinde de tine", mark: "no" },
            agency: { text: "Sumă fixă în fiecare lună — cel mai predictibil", mark: "yes" },
          },
        ] as Row[],
        honestTitle: "Când alternativa e mai bună decât noi",
        honest: [
          "Vrei venit fix, fără nicio variație lunară și fără să te intereseze maximizarea → chirie clasică prin agenție.",
          "Îți place să gestionezi oaspeți, ai timp liber și vrei să înveți pricingul → self-management pe Airbnb.",
          "Folosești apartamentul des pentru tine sau familie → regimul hotelier administrat nu are sens.",
        ],
        ctaPrimary: "Vreau varianta administrată",
        ctaSecondary: "Vezi comisionul exact",
        disclaimer:
          "Cifrele sunt estimări orientative pentru un apartament de 2 camere în Timișoara, zona Cetate, la 75% ocupare medie anuală. Rezultatul real depinde de zonă, dotări, capacitate și recenzii.",
      }
    : {
        badge: "Honest comparison",
        title: "RealTrust vs. doing it yourself vs. a classic agency",
        subtitle:
          "Three real options, same criteria. We also show you where the alternatives beat us.",
        colRealtrust: "RealTrust",
        colRealtrustSub: "Managed short-stay",
        colDiy: "Solo on Airbnb/Booking",
        colDiySub: "You do everything",
        colAgency: "Classic agency",
        colAgencySub: "Long-term rent / brokerage",
        recommended: "Recommended",
        rows: [
          {
            label: "Commission / cost",
            realtrust: { text: "15–25% of net revenue, no subscription", mark: "yes" },
            diy: { text: "No management fee, but 3–17% platform fees", mark: "yes" },
            agency: { text: "E.g. one month's rent, or 8–10% management", mark: "partial" },
          },
          {
            label: "Your time per month",
            realtrust: { text: "~30 min: approve expenses, read the report", mark: "yes" },
            diy: { text: "20–40 hours: messages, check-ins, cleaning, pricing", mark: "no" },
            agency: { text: "1–2 hours: only incidents and renewals", mark: "yes" },
          },
          {
            label: "Estimated net income (2 rooms, Cetate)",
            hint: "Indicative estimate based on a 75% annual average occupancy.",
            realtrust: { text: "~€1,100–1,400/month net", mark: "yes" },
            diy: { text: "~€900–1,200/month, varies with experience", mark: "partial" },
            agency: { text: "~€550–750/month (classic rent)", mark: "no" },
          },
          {
            label: "Achieved average occupancy",
            realtrust: { text: "~75% per year, rates adjusted daily", mark: "yes" },
            diy: { text: "45–65% typical in year one, no dynamic pricing", mark: "partial" },
            agency: { text: "100% occupied, but at a much lower fixed rate", mark: "partial" },
          },
          {
            label: "Who answers guests",
            realtrust: { text: "Our team, including evenings and weekends", mark: "yes" },
            diy: { text: "You, at any hour — holidays included", mark: "no" },
            agency: { text: "Not applicable (long-term tenant)", mark: "partial" },
          },
          {
            label: "Cleaning, linen, consumables",
            realtrust: { text: "Included, in-house team, checked after every stay", mark: "yes" },
            diy: { text: "You organise and pay for them separately", mark: "no" },
            agency: { text: "Not included", mark: "no" },
          },
          {
            label: "Professional photos and listing copy",
            realtrust: { text: "Included, no upfront cost", mark: "yes" },
            diy: { text: "€300–600 out of your own pocket", mark: "no" },
            agency: { text: "Usually basic phone photos", mark: "partial" },
          },
          {
            label: "Guest damage",
            realtrust: { text: "3 layers of cover, under €150 we absorb it", mark: "yes" },
            diy: { text: "You file the claim and cover the gap", mark: "no" },
            agency: { text: "Tenant deposit, if anything is left of it", mark: "partial" },
          },
          {
            label: "Reporting and transparency",
            realtrust: { text: "Owner portal + monthly PDF, payout by the 10th", mark: "yes" },
            diy: { text: "You build your own spreadsheet", mark: "partial" },
            agency: { text: "Usually just the contract and receipts", mark: "partial" },
          },
          {
            label: "Exiting the arrangement",
            realtrust: { text: "90-day trial, then 30 days' notice, €0 fees", mark: "yes" },
            diy: { text: "Stop anytime (but you lose the ranking you built)", mark: "yes" },
            agency: { text: "Tied to the tenancy contract term", mark: "partial" },
          },
          {
            label: "Wear and tear",
            realtrust: { text: "More turnover, but inspection and repair after each stay", mark: "partial" },
            diy: { text: "Same turnover, weaker control", mark: "partial" },
            agency: { text: "A single tenant — the lowest wear", mark: "yes" },
          },
          {
            label: "Monthly predictability",
            realtrust: { text: "Varies with the season (see the seasonality chart)", mark: "partial" },
            diy: { text: "Highest variation, depends entirely on you", mark: "no" },
            agency: { text: "Fixed amount every month — most predictable", mark: "yes" },
          },
        ] as Row[],
        honestTitle: "When the alternative beats us",
        honest: [
          "You want a fixed income with zero monthly variation and don't care about maximising → classic rent via an agency.",
          "You enjoy hosting, have spare time and want to learn pricing → self-management on Airbnb.",
          "You use the apartment often yourself or for family → managed short stays don't make sense.",
        ],
        ctaPrimary: "I want the managed option",
        ctaSecondary: "See the exact commission",
        disclaimer:
          "Figures are indicative estimates for a 2-room apartment in Timișoara, Cetate area, at 75% average annual occupancy. Real results depend on area, amenities, capacity and reviews.",
      };

  const handleCta = () => {
    trackConversion({ event: "whatsapp_click", source: "owners_competitor_comparison" });
  };

  return (
    <section className="py-20 bg-background" aria-labelledby="owner-comparison-title">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge variant="secondary" className="mb-4">
            <Scale className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
            {t.badge}
          </Badge>
          <h2
            id="owner-comparison-title"
            className="text-3xl md:text-4xl font-serif font-semibold text-foreground mb-4"
          >
            {t.title}
          </h2>
          <p className="text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="max-w-6xl mx-auto">
          {/* Desktop / tablet table */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <caption className="sr-only">{t.title}</caption>
              <thead>
                <tr className="bg-secondary">
                  <th scope="col" className="text-left font-semibold text-foreground p-4 w-[22%]">
                    <span className="sr-only">{t.badge}</span>
                  </th>
                  <th scope="col" className="text-left p-4 w-[26%] bg-primary/10">
                    <span className="block font-semibold text-foreground">{t.colRealtrust}</span>
                    <span className="block text-xs text-muted-foreground font-normal">
                      {t.colRealtrustSub}
                    </span>
                    <Badge className="mt-2">{t.recommended}</Badge>
                  </th>
                  <th scope="col" className="text-left p-4 w-[26%]">
                    <span className="block font-semibold text-foreground">{t.colDiy}</span>
                    <span className="block text-xs text-muted-foreground font-normal">
                      {t.colDiySub}
                    </span>
                  </th>
                  <th scope="col" className="text-left p-4 w-[26%]">
                    <span className="block font-semibold text-foreground">{t.colAgency}</span>
                    <span className="block text-xs text-muted-foreground font-normal">
                      {t.colAgencySub}
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {t.rows.map((row, i) => (
                  <tr
                    key={row.label}
                    className={i % 2 === 1 ? "bg-secondary/40" : "bg-background"}
                  >
                    <th scope="row" className="text-left align-top p-4 font-medium text-foreground">
                      {row.label}
                      {row.hint && (
                        <span className="block text-xs text-muted-foreground font-normal mt-1">
                          {row.hint}
                        </span>
                      )}
                    </th>
                    <td className="align-top p-4 bg-primary/5">
                      <span className="flex gap-2 text-foreground">
                        <MarkIcon mark={row.realtrust.mark} />
                        <span>{row.realtrust.text}</span>
                      </span>
                    </td>
                    <td className="align-top p-4">
                      <span className="flex gap-2 text-muted-foreground">
                        <MarkIcon mark={row.diy.mark} />
                        <span>{row.diy.text}</span>
                      </span>
                    </td>
                    <td className="align-top p-4">
                      <span className="flex gap-2 text-muted-foreground">
                        <MarkIcon mark={row.agency.mark} />
                        <span>{row.agency.text}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: stacked cards per criterion */}
          <div className="md:hidden space-y-4">
            {t.rows.map((row) => (
              <Card key={row.label} className="border-border">
                <CardContent className="p-4 space-y-3">
                  <p className="font-semibold text-foreground text-sm">{row.label}</p>
                  {row.hint && (
                    <p className="text-xs text-muted-foreground -mt-2">{row.hint}</p>
                  )}
                  <div className="rounded-lg bg-primary/10 p-3">
                    <p className="text-xs font-semibold text-primary mb-1">{t.colRealtrust}</p>
                    <p className="flex gap-2 text-sm text-foreground">
                      <MarkIcon mark={row.realtrust.mark} />
                      <span>{row.realtrust.text}</span>
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs font-semibold text-foreground mb-1">{t.colDiy}</p>
                    <p className="flex gap-2 text-sm text-muted-foreground">
                      <MarkIcon mark={row.diy.mark} />
                      <span>{row.diy.text}</span>
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs font-semibold text-foreground mb-1">{t.colAgency}</p>
                    <p className="flex gap-2 text-sm text-muted-foreground">
                      <MarkIcon mark={row.agency.mark} />
                      <span>{row.agency.text}</span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Honest "when not us" block */}
          <div className="mt-8 rounded-xl border border-border bg-secondary/40 p-5">
            <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" aria-hidden="true" />
              {t.honestTitle}
            </p>
            <ul className="space-y-2">
              {t.honest.map((item) => (
                <li key={item} className="flex gap-2 text-sm text-muted-foreground">
                  <Minus className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" onClick={handleCta}>
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
            <Button asChild size="lg" variant="outline">
              <Link to="/preturi" aria-label={t.ctaSecondary}>
                {t.ctaSecondary}
                <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
              </Link>
            </Button>
          </div>

          <p className="mt-5 text-xs text-muted-foreground text-center max-w-3xl mx-auto">
            {t.disclaimer}
          </p>
        </div>
      </div>
    </section>
  );
};

export default OwnerCompetitorComparison;
