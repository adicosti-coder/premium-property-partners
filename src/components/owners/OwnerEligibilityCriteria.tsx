import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  XCircle,
  ClipboardCheck,
  MessageCircle,
  ArrowRight,
  Info,
} from "lucide-react";
import { Link } from "react-router-dom";
import { trackConversion } from "@/lib/conversionTracking";

/**
 * OwnerEligibilityCriteria — criterii publice de acceptare a unei proprietăți
 * în administrare, inclusiv cazurile în care refuzăm.
 * Scop: filtrează lead-urile nepotrivite și crește încrederea prin selectivitate.
 * Pur prezentațional, bilingv RO/EN, fără backend.
 */
const WHATSAPP_URL =
  "https://wa.me/40799069256?text=" +
  encodeURIComponent(
    "Bună! Vreau să știu dacă apartamentul meu se califică pentru administrare în regim hotelier.",
  );

const OwnerEligibilityCriteria = () => {
  const { language } = useLanguage();
  const isRo = language === "ro";

  const t = isRo
    ? {
        badge: "Criterii de eligibilitate",
        title: "Nu luăm orice apartament în administrare",
        subtitle:
          "Preferăm să spunem „nu” la început, decât să promitem cifre pe care apartamentul tău nu le poate susține. Iată exact ce căutăm și ce refuzăm.",
        acceptTitle: "Ce acceptăm",
        acceptBadge: "Se califică",
        accept: [
          {
            label: "Zonă cu cerere reală",
            value:
              "Cetate/Centru, Iosefin, Fabric, Dumbrăvița, zona Aradului sau la maximum 15 minute de centru. În afara acestor zone analizăm caz cu caz.",
          },
          {
            label: "1–3 camere, complet mobilat",
            value:
              "Studio, 2 sau 3 camere, mobilat și utilat de la început (mașină de spălat, wi-fi stabil, aer condiționat, bucătărie funcțională).",
          },
          {
            label: "Stare bună, fără lucrări în curs",
            value:
              "Finisaje curate, instalații funcționale, fără infiltrații și fără renovări în bloc care blochează accesul oaspeților.",
          },
          {
            label: "Acces și acte în ordine",
            value:
              "Proprietate cu acte clare, fără litigii, cu posibilitatea de a instala keybox/smart-lock și de a permite regim hotelier.",
          },
          {
            label: "Disponibilitate minimă 12 luni",
            value:
              "Ai nevoie de un sezon complet ca să vezi rezultatul real. Sub 12 luni nu apucăm să amortizăm fotografiile și poziționarea în platforme.",
          },
        ],
        rejectTitle: "Când spunem „nu"",
        rejectBadge: "Nu se califică",
        reject: [
          {
            label: "Asociație sau vecini care interzic regimul hotelier",
            value:
              "Dacă regulamentul blocului sau hotărârea asociației interzice cazarea de scurtă durată, nu preluăm apartamentul. Verificăm asta înainte de contract.",
          },
          {
            label: "Apartamente nemobilate sau în șantier",
            value:
              "Nu preluăm spații care necesită investiții mari de amenajare pe care proprietarul nu vrea să le facă. Putem recomanda, dar nu administrăm gol.",
          },
          {
            label: "Zone fără cerere turistică sau de business",
            value:
              "În cartiere periferice fără transport și fără puncte de interes, ocuparea nu susține modelul. Acolo îți recomandăm sincer chirie clasică.",
          },
          {
            label: "Așteptări nerealiste de venit",
            value:
              "Dacă cifra pe care o ai în minte e cu mult peste ce poate genera apartamentul, îți arătăm calculul real. Dacă tot nu se potrivește, nu semnăm.",
          },
          {
            label: "Proprietar care vrea să folosească des apartamentul",
            value:
              "Blocările frecvente și de ultim moment distrug scorul pe platforme. Sub 10 nopți rezervate personal pe an e în regulă; peste, nu funcționează.",
          },
        ],
        note: "Dacă apartamentul nu se califică acum, îți spunem exact ce ar trebui schimbat ca să se califice — fără costuri și fără insistență.",
        ctaPrimary: "Verifică dacă apartamentul se califică",
        ctaSecondary: "Vezi pachetele și comisionul",
      }
    : {
        badge: "Eligibility criteria",
        title: "We don't take on every apartment",
        subtitle:
          "We'd rather say no upfront than promise numbers your apartment can't sustain. Here's exactly what we look for and what we turn down.",
        acceptTitle: "What we accept",
        acceptBadge: "Qualifies",
        accept: [
          {
            label: "Area with real demand",
            value:
              "Cetate/Centre, Iosefin, Fabric, Dumbrăvița, the Aradului area, or up to 15 minutes from the centre. Outside these we assess case by case.",
          },
          {
            label: "1–3 rooms, fully furnished",
            value:
              "Studio, 2 or 3 rooms, furnished and equipped from day one (washing machine, stable wi-fi, air conditioning, working kitchen).",
          },
          {
            label: "Good condition, no ongoing works",
            value:
              "Clean finishes, working installations, no water damage and no building renovations blocking guest access.",
          },
          {
            label: "Clear access and paperwork",
            value:
              "Clear title, no disputes, and the option to install a keybox/smart lock and operate short-term stays.",
          },
          {
            label: "Minimum 12 months availability",
            value:
              "You need a full season to see the real outcome. Under 12 months we can't amortise the photography and platform positioning.",
          },
        ],
        rejectTitle: "When we say no",
        rejectBadge: "Doesn't qualify",
        reject: [
          {
            label: "Building rules that ban short-term stays",
            value:
              "If the building regulation or owners' association decision forbids short stays, we don't take it on. We check this before any contract.",
          },
          {
            label: "Unfurnished apartments or active building sites",
            value:
              "We don't take on spaces needing major fit-out the owner isn't willing to fund. We can advise, but we don't manage empty units.",
          },
          {
            label: "Areas with no tourist or business demand",
            value:
              "In peripheral neighbourhoods with no transport and no points of interest, occupancy can't sustain the model. There we honestly recommend a classic rental.",
          },
          {
            label: "Unrealistic income expectations",
            value:
              "If the figure you have in mind is far above what the apartment can generate, we show you the real maths. If it still doesn't fit, we don't sign.",
          },
          {
            label: "Owners who use the apartment often",
            value:
              "Frequent last-minute blocks destroy platform ranking. Under 10 personal nights a year is fine; above that it doesn't work.",
          },
        ],
        note: "If the apartment doesn't qualify today, we tell you exactly what would need to change — free of charge and with no pressure.",
        ctaPrimary: "Check if your apartment qualifies",
        ctaSecondary: "See packages and commission",
      };

  const handleCheck = () => {
    trackConversion({ event: "whatsapp_click", source: "owners_eligibility_criteria" });
  };

  return (
    <section className="py-20 bg-secondary/40" aria-labelledby="owner-eligibility-title">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge variant="secondary" className="mb-4">
            <ClipboardCheck className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
            {t.badge}
          </Badge>
          <h2
            id="owner-eligibility-title"
            className="text-3xl md:text-4xl font-serif font-semibold text-foreground mb-4"
          >
            {t.title}
          </h2>
          <p className="text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
          <Card className="border-border bg-background">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-xl flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" aria-hidden="true" />
                  {t.acceptTitle}
                </CardTitle>
                <Badge className="shrink-0">{t.acceptBadge}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {t.accept.map((item) => (
                  <li key={item.label} className="flex gap-3">
                    <CheckCircle2
                      className="w-5 h-5 text-primary shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="font-semibold text-foreground text-sm">{item.label}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {item.value}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-border bg-background">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-xl flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-destructive" aria-hidden="true" />
                  {t.rejectTitle}
                </CardTitle>
                <Badge variant="outline" className="shrink-0">
                  {t.rejectBadge}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {t.reject.map((item) => (
                  <li key={item.label} className="flex gap-3">
                    <XCircle
                      className="w-5 h-5 text-destructive shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="font-semibold text-foreground text-sm">{item.label}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {item.value}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="max-w-6xl mx-auto mt-8">
          <div className="rounded-xl border border-border bg-background p-5 flex flex-col md:flex-row md:items-center gap-4">
            <p className="text-sm text-muted-foreground flex-1 flex gap-2">
              <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
              <span>{t.note}</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild onClick={handleCheck}>
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
              <Button asChild variant="outline">
                <Link to="/preturi" aria-label={t.ctaSecondary}>
                  {t.ctaSecondary}
                  <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OwnerEligibilityCriteria;
