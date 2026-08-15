import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Ruler, ShieldCheck, Wrench, XCircle } from "lucide-react";

/**
 * OwnerRisksLimits — transparență pe condiții minime, standarde de amenajare,
 * garanții de neocupare și mentenanță. Include explicit "când NU recomandăm regim hotelier".
 * Componentă pur prezentațională.
 */
const OwnerRisksLimits = () => {
  const { language } = useLanguage();
  const isRo = language === "ro";

  const t = isRo
    ? {
        badge: "Riscuri și limite",
        title: "Ce cerem, ce garantăm și când te sfătuim să nu o faci",
        subtitle:
          "Preferăm să pierdem un contract decât să promitem un venit care nu se poate susține în zona ta.",
        minTitle: "Condiții minime ale apartamentului",
        min: [
          "Suprafață utilă de la 30 m², bucătărie complet funcțională",
          "Centrală proprie sau termoficare fiabilă + aer condiționat",
          "Internet fiber minim 100 Mbps, mașină de spălat",
          "Baie fără igrasie, instalații sanitare fără intervenții urgente",
          "Acces independent și posibilitate de montare yală smart",
        ],
        standardTitle: "Standarde de amenajare",
        standard: [
          "Lenjerie hotelieră albă, 2 seturi complete per pat",
          "Pat cu saltea sub 5 ani, perdele opace, iluminat cald",
          "Bucătărie utilată: espressor, veselă pentru capacitatea maximă",
          "TV smart, prize USB lângă pat, uscător de păr, fier de călcat",
          "Zero obiecte personale sau mobilier deteriorat în spațiile comune",
        ],
        standardNote:
          "Dacă lipsesc elemente, îți dăm o listă cu costuri estimate înainte de semnare. Investiția tipică de aducere la standard: 1.500–3.500 €.",
        guaranteeTitle: "Ce garantăm noi",
        guarantees: [
          {
            icon: ShieldCheck,
            title: "Garanție de neocupare",
            body: "Dacă în primele 3 luni ocuparea medie rămâne sub 55%, nu îți percepem comision de administrare pe luna respectivă.",
          },
          {
            icon: Wrench,
            title: "Mentenanță și intervenții",
            body: "Intervenim în maximum 24h pentru orice defecțiune raportată. Reparațiile sub 100 € le rezolvăm fără să te deranjăm, cu decont în raportul lunar.",
          },
          {
            icon: CheckCircle2,
            title: "Daune produse de oaspeți",
            body: "Acoperite din garanțiile platformelor și, peste plafon, din fondul nostru de intervenție. Nu îți trimitem facturi pentru pahare sparte.",
          },
        ],
        avoidTitle: "Când NU recomandăm regim hotelier",
        avoid: [
          "Apartament la periferie, fără transport public la mai puțin de 10 minute",
          "Bloc cu regulament intern care interzice explicit cazarea turistică",
          "Buget zero pentru amenajare — sub standard, recenziile scad tarifele rapid",
          "Vrei venit fix, garantat lunar, indiferent de sezon — atunci chiria clasică e mai potrivită",
          "Intenționezi să vinzi apartamentul în următoarele 6 luni",
        ],
        cta: "Discută limitele pe apartamentul tău",
      }
    : {
        badge: "Risks and limits",
        title: "What we require, what we guarantee, and when we advise against it",
        subtitle: "We would rather lose a contract than promise income your area cannot sustain.",
        minTitle: "Minimum apartment requirements",
        min: [
          "From 30 m² usable area, fully functional kitchen",
          "Own boiler or reliable district heating + air conditioning",
          "Fiber internet from 100 Mbps, washing machine",
          "Bathroom free of damp, plumbing without urgent works",
          "Independent access and the option to fit a smart lock",
        ],
        standardTitle: "Furnishing standards",
        standard: [
          "White hotel linen, 2 complete sets per bed",
          "Mattress under 5 years old, blackout curtains, warm lighting",
          "Equipped kitchen: espresso machine, tableware for max capacity",
          "Smart TV, USB sockets by the bed, hair dryer, iron",
          "No personal items or damaged furniture in shared spaces",
        ],
        standardNote:
          "If items are missing, you get a costed list before signing. Typical upgrade investment: €1,500–3,500.",
        guaranteeTitle: "What we guarantee",
        guarantees: [
          { icon: ShieldCheck, title: "Low-occupancy guarantee", body: "If average occupancy stays below 55% in the first 3 months, we charge no management fee for that month." },
          { icon: Wrench, title: "Maintenance and callouts", body: "We respond within 24h to any reported fault. Repairs under €100 are handled without disturbing you, itemised in the monthly report." },
          { icon: CheckCircle2, title: "Guest-caused damage", body: "Covered by platform deposits and, above that, by our own intervention fund. We don't invoice you for broken glasses." },
        ],
        avoidTitle: "When we do NOT recommend short-term rental",
        avoid: [
          "Peripheral apartment with no public transport within 10 minutes",
          "Building whose internal rules explicitly forbid tourist accommodation",
          "Zero furnishing budget — below standard, reviews quickly cut your rates",
          "You want fixed monthly income regardless of season — long-term rental fits better",
          "You plan to sell the apartment within the next 6 months",
        ],
        cta: "Discuss the limits for your apartment",
      };

  return (
    <section id="riscuri-limite" className="py-16 md:py-20 bg-muted/30 scroll-mt-24">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-10">
          <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/5">
            <AlertTriangle className="w-4 h-4 mr-2 text-primary" aria-hidden="true" />
            {t.badge}
          </Badge>
          <h2 className="text-2xl md:text-3xl font-bold mb-3">{t.title}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">{t.subtitle}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary" aria-hidden="true" />
                {t.minTitle}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {t.min.map((item) => (
                  <li key={item} className="flex gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Ruler className="w-5 h-5 text-primary" aria-hidden="true" />
                {t.standardTitle}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {t.standard.map((item) => (
                  <li key={item} className="flex gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground mt-4">{t.standardNote}</p>
            </CardContent>
          </Card>
        </div>

        <h3 className="text-lg font-semibold mt-10 mb-4">{t.guaranteeTitle}</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          {t.guarantees.map((g) => (
            <Card key={g.title} className="border-primary/15">
              <CardContent className="p-5">
                <g.icon className="w-6 h-6 text-primary mb-3" aria-hidden="true" />
                <p className="font-semibold text-sm mb-1">{g.title}</p>
                <p className="text-xs text-muted-foreground">{g.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-10 border-destructive/25 bg-destructive/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <XCircle className="w-5 h-5 text-destructive" aria-hidden="true" />
              {t.avoidTitle}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {t.avoid.map((item) => (
                <li key={item} className="flex gap-2">
                  <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Button asChild variant="outline" className="mt-6 min-h-12">
              <a href="#call-15-min">{t.cta}</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default OwnerRisksLimits;
