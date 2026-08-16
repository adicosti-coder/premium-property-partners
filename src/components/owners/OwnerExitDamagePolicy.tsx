import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DoorOpen,
  ShieldCheck,
  CalendarClock,
  BadgeCheck,
  Ban,
  ArrowRight,
  MessageCircle,
  AlertTriangle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { trackConversion } from "@/lib/conversionTracking";

/**
 * OwnerExitDamagePolicy — răspunde celor două frici nerezolvate vizual:
 * 1) "cum ies din contract dacă nu-mi place?" (perioadă de probă + clauză de exit)
 * 2) "cine plătește dacă un oaspete îmi distruge apartamentul?" (politica de daune)
 * Pur prezentațional, bilingv RO/EN, fără backend.
 */
const WHATSAPP_URL =
  "https://wa.me/40799069256?text=" +
  encodeURIComponent(
    "Bună! Vreau detalii despre perioada de probă, clauza de ieșire și politica de daune.",
  );

const OwnerExitDamagePolicy = () => {
  const { language } = useLanguage();
  const isRo = language === "ro";

  const t = isRo
    ? {
        badge: "Zero risc la decizie",
        title: "Poți ieși oricând. Iar dacă apar daune, nu le plătești tu.",
        subtitle:
          "Cele două întrebări pe care ni le pune fiecare proprietar înainte de semnare. Răspunsul complet, scris, înainte să discutăm cifre.",
        exitTitle: "Perioadă de probă și ieșire din contract",
        exitBadge: "Fără penalizări",
        exitItems: [
          {
            icon: BadgeCheck,
            label: "Perioadă de probă 90 de zile",
            value:
              "În primele 3 luni poți renunța cu preaviz de 15 zile, fără nicio penalizare și fără justificare.",
          },
          {
            icon: CalendarClock,
            label: "După probă: preaviz 30 de zile",
            value:
              "Anunți în scris (email sau WhatsApp) și contractul se închide la finalul celor 30 de zile.",
          },
          {
            icon: Ban,
            label: "Fără taxe de ieșire",
            value:
              "0 € penalizare, 0 € taxă administrativă, 0 € reținere din ultima încasare.",
          },
          {
            icon: DoorOpen,
            label: "Pleci cu tot ce am construit",
            value:
              "Îți predăm fotografiile profesionale, textele anunțurilor și istoricul de rezervări. Conturile de pe Booking/Airbnb pot fi transferate pe numele tău.",
          },
        ],
        exitNote:
          "Singura obligație rămasă: onorăm rezervările deja confirmate de oaspeți în perioada de preaviz. Încasările din acele nopți îți rămân integral.",
        damageTitle: "Politica de daune produse de oaspeți",
        damageBadge: "Acoperire pe 3 niveluri",
        damageLevels: [
          {
            step: "1",
            label: "Garanția oaspetelui",
            value:
              "Fiecare rezervare directă are garanție de daune reținută pre-autorizat. Pe Booking și Airbnb activăm protecția platformei (AirCover / politica de daune a proprietății).",
          },
          {
            step: "2",
            label: "Asigurarea de răspundere",
            value:
              "Poliță de răspundere civilă pentru activitatea de administrare, care acoperă incidentele produse în timpul șederii.",
          },
          {
            step: "3",
            label: "Fondul RealTrust",
            value:
              "Dacă daunele mici (sub 150 €) nu sunt recuperate de la oaspete, le suportăm noi din comision. Tu nu primești facturi surpriză.",
          },
        ],
        damageProcessTitle: "Cum funcționează în practică",
        damageProcess: [
          "Verificare la fiecare check-out, cu fotografii datate ale inventarului.",
          "Îți trimitem raportul incidentului în maximum 24 de ore, cu dovezi.",
          "Deschidem noi reclamația la platformă sau la asigurator — tu nu ai nicio birocrație.",
          "Reparăm și reînlocuim rapid, ca apartamentul să nu piardă rezervări.",
        ],
        exclusionsTitle: "Ce NU acoperim (transparent)",
        exclusions: [
          "Uzura normală a mobilierului și a electrocasnicelor.",
          "Defecțiuni preexistente sau instalații vechi (electrice, sanitare, centrală).",
          "Reparații structurale și probleme din partea asociației sau a blocului.",
        ],
        ctaPrimary: "Cere clauza de exit în scris",
        ctaSecondary: "Vezi termenii contractului",
      }
    : {
        badge: "Zero-risk decision",
        title: "You can exit anytime. And if damage happens, you don't pay for it.",
        subtitle:
          "The two questions every owner asks before signing. Full written answer, before we even talk numbers.",
        exitTitle: "Trial period and contract exit",
        exitBadge: "No penalties",
        exitItems: [
          {
            icon: BadgeCheck,
            label: "90-day trial period",
            value:
              "In the first 3 months you can walk away with 15 days' notice — no penalty, no explanation needed.",
          },
          {
            icon: CalendarClock,
            label: "After trial: 30 days' notice",
            value:
              "Send written notice (email or WhatsApp) and the contract ends after those 30 days.",
          },
          {
            icon: Ban,
            label: "No exit fees",
            value: "€0 penalty, €0 admin fee, €0 withheld from your final payout.",
          },
          {
            icon: DoorOpen,
            label: "You keep everything we built",
            value:
              "We hand over the professional photos, listing copy and booking history. Booking/Airbnb accounts can be transferred to your name.",
          },
        ],
        exitNote:
          "The only remaining obligation: we honour guest bookings already confirmed during the notice period. Revenue from those nights is fully yours.",
        damageTitle: "Guest damage policy",
        damageBadge: "3 layers of cover",
        damageLevels: [
          {
            step: "1",
            label: "Guest guarantee",
            value:
              "Every direct booking carries a pre-authorised damage deposit. On Booking and Airbnb we activate platform protection (AirCover / property damage policy).",
          },
          {
            step: "2",
            label: "Liability insurance",
            value:
              "Civil liability policy for the management activity, covering incidents during a guest stay.",
          },
          {
            step: "3",
            label: "The RealTrust fund",
            value:
              "If small damage (under €150) isn't recovered from the guest, we absorb it from our commission. No surprise invoices for you.",
          },
        ],
        damageProcessTitle: "How it works in practice",
        damageProcess: [
          "Inventory check at every check-out, with dated photos.",
          "You get the incident report within 24 hours, with evidence.",
          "We file the claim with the platform or insurer — zero paperwork for you.",
          "We repair and replace fast, so the apartment doesn't lose bookings.",
        ],
        exclusionsTitle: "What we do NOT cover (transparently)",
        exclusions: [
          "Normal wear and tear of furniture and appliances.",
          "Pre-existing faults or ageing installations (electrical, plumbing, boiler).",
          "Structural repairs and issues caused by the building or owners' association.",
        ],
        ctaPrimary: "Request the exit clause in writing",
        ctaSecondary: "See contract terms",
      };

  const handleRequest = () => {
    trackConversion("whatsapp_click", {
      source: "owner_exit_damage_policy",
      language,
    });
  };

  return (
    <section className="py-20 bg-background" aria-labelledby="owner-exit-damage-title">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge variant="secondary" className="mb-4">
            <ShieldCheck className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
            {t.badge}
          </Badge>
          <h2
            id="owner-exit-damage-title"
            className="text-3xl md:text-4xl font-serif font-semibold text-foreground mb-4"
          >
            {t.title}
          </h2>
          <p className="text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {/* Exit clause */}
          <Card className="border-border">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-xl flex items-center gap-2">
                  <DoorOpen className="w-5 h-5 text-primary" aria-hidden="true" />
                  {t.exitTitle}
                </CardTitle>
                <Badge className="shrink-0">{t.exitBadge}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <ul className="space-y-4">
                {t.exitItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.label} className="flex gap-3">
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="w-4 h-4 text-primary" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{item.label}</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {item.value}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-3">
                {t.exitNote}
              </p>
            </CardContent>
          </Card>

          {/* Damage policy */}
          <Card className="border-border">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-xl flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" aria-hidden="true" />
                  {t.damageTitle}
                </CardTitle>
                <Badge className="shrink-0">{t.damageBadge}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <ol className="space-y-4">
                {t.damageLevels.map((level) => (
                  <li key={level.step} className="flex gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
                      {level.step}
                    </span>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{level.label}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {level.value}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="rounded-lg bg-secondary p-4">
                <p className="text-sm font-semibold text-foreground mb-2">
                  {t.damageProcessTitle}
                </p>
                <ul className="space-y-1.5">
                  {t.damageProcess.map((step) => (
                    <li key={step} className="flex gap-2 text-sm text-muted-foreground">
                      <BadgeCheck
                        className="w-4 h-4 text-primary shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg border border-border p-4">
                <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-primary" aria-hidden="true" />
                  {t.exclusionsTitle}
                </p>
                <ul className="space-y-1.5">
                  {t.exclusions.map((item) => (
                    <li key={item} className="flex gap-2 text-sm text-muted-foreground">
                      <Ban className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-1">
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

export default OwnerExitDamagePolicy;
