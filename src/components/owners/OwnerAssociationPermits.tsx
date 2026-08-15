import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building, ClipboardCheck, FileSignature, Landmark, Stamp, Users2 } from "lucide-react";

/**
 * OwnerAssociationPermits — clarificări legale: acordul vecinilor/asociației de proprietari
 * și pașii pentru certificatul de clasificare (autoritatea națională de turism).
 * Componentă pur prezentațională.
 */
const OwnerAssociationPermits = () => {
  const { language } = useLanguage();
  const isRo = language === "ro";

  const t = isRo
    ? {
        badge: "Asociație & autorizații",
        title: "Acordul vecinilor și clasificarea — pas cu pas, fără surprize",
        subtitle:
          "Partea birocratică este cea care blochează cei mai mulți proprietari. În pachetele Premium și Full o preluăm integral noi.",
        assocTitle: "Asociația de proprietari și vecinii",
        assoc: [
          {
            icon: Users2,
            title: "Ce acord este necesar",
            body: "Pentru schimbarea destinației în spațiu de cazare turistică ai nevoie de acordul asociației de proprietari și de acordul vecinilor direct afectați (apartamentele limitrofe: lateral, sus, jos).",
          },
          {
            icon: FileSignature,
            title: "Cum se obține în practică",
            body: "Cerere scrisă către comitetul asociației + tabel de semnături pentru vecinii limitrofi. Pregătim documentele și mergem cu tine la discuția cu administratorul.",
          },
          {
            icon: Building,
            title: "Regulamentul intern al blocului",
            body: "Verificăm întâi regulamentul: dacă interzice explicit cazarea turistică, îți spunem înainte să investești un leu în amenajare.",
          },
        ],
        assocNote:
          "Argumentul care funcționează cu vecinii: reguli clare de liniște, fără petreceri, curățenie profesională săptămânală și un număr de telefon disponibil 24/7 pentru administrator.",
        classTitle: "Certificatul de clasificare — pașii",
        steps: [
          { n: "01", title: "Dosarul de bază", body: "Act de proprietate, CI proprietar, certificat constatator / documente firmă (dacă operezi pe SRL), dovada acordului asociației." },
          { n: "02", title: "Fișa de dotare", body: "Completăm fișa cu dotările pe categorii (1–5 stele / margarete) și facem apartamentul conform categoriei țintă." },
          { n: "03", title: "Declarație pe propria răspundere", body: "Depunere la autoritatea națională de turism (Ministerul Economiei/Turismului) — clasificarea funcționează pe declarație, cu control ulterior." },
          { n: "04", title: "Primăria Timișoara", body: "Autorizație de funcționare, înregistrare pentru taxa hotelieră locală și raportare lunară a nopților vândute." },
          { n: "05", title: "Obligații curente", body: "Registrul oaspeților, raportarea cetățenilor străini, conformitate sanitară și PSI conform categoriei obținute." },
        ],
        durationLabel: "Durată uzuală",
        durationValue: "3–6 săptămâni",
        durationNote: "de la depunerea completă a dosarului",
        weDoTitle: "Ce facem noi în locul tău",
        weDo: [
          "Verificarea regulamentului blocului înainte de orice investiție",
          "Redactarea cererii și strângerea acordurilor de la vecini",
          "Întocmirea și depunerea dosarului de clasificare",
          "Înregistrarea la Primărie și raportarea lunară a taxei hoteliere",
        ],
        cta: "Vreau să preluați partea birocratică",
        disclaimer:
          "Informațiile reflectă practica din 2026 în Timișoara și nu constituie consultanță juridică. Legislația se poate modifica; verificăm împreună cerințele la momentul depunerii.",
      }
    : {
        badge: "Association & permits",
        title: "Neighbour approval and classification — step by step, no surprises",
        subtitle:
          "Paperwork is what stops most owners. In our Premium and Full packages we take it over entirely.",
        assocTitle: "Owners' association and neighbours",
        assoc: [
          { icon: Users2, title: "Which approval you need", body: "To change the use to tourist accommodation you need the owners' association approval plus the consent of directly affected neighbours (adjacent flats: side, above, below)." },
          { icon: FileSignature, title: "How it works in practice", body: "Written request to the association committee plus a signature sheet for adjacent neighbours. We prepare the documents and join the meeting with the administrator." },
          { icon: Building, title: "The building's internal rules", body: "We check the rules first: if tourist accommodation is explicitly forbidden, you'll know before spending a single euro on furnishing." },
        ],
        assocNote:
          "What actually convinces neighbours: clear quiet rules, no parties, weekly professional cleaning, and a 24/7 phone number for the administrator.",
        classTitle: "The classification certificate — steps",
        steps: [
          { n: "01", title: "Core file", body: "Title deed, owner ID, company documents (if operating through a company), proof of association approval." },
          { n: "02", title: "Amenity sheet", body: "We complete the amenity sheet per category (1–5 stars/daisies) and bring the flat up to the target category." },
          { n: "03", title: "Self-declaration", body: "Filed with the national tourism authority — classification runs on declaration, with subsequent inspection." },
          { n: "04", title: "Timișoara City Hall", body: "Operating authorisation, registration for the local accommodation tax and monthly reporting of nights sold." },
          { n: "05", title: "Ongoing duties", body: "Guest register, reporting of foreign nationals, sanitary and fire-safety compliance per the obtained category." },
        ],
        durationLabel: "Usual duration",
        durationValue: "3–6 weeks",
        durationNote: "from complete submission",
        weDoTitle: "What we handle for you",
        weDo: [
          "Checking the building rules before any investment",
          "Drafting the request and collecting neighbour approvals",
          "Preparing and filing the classification file",
          "City Hall registration and monthly accommodation-tax reporting",
        ],
        cta: "I want you to handle the paperwork",
        disclaimer:
          "Information reflects 2026 practice in Timișoara and is not legal advice. Legislation may change; we verify requirements together at filing time.",
      };

  return (
    <section id="asociatie-autorizatii" className="py-16 md:py-20 bg-background scroll-mt-24">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-10">
          <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/5">
            <Stamp className="w-4 h-4 mr-2 text-primary" aria-hidden="true" />
            {t.badge}
          </Badge>
          <h2 className="text-2xl md:text-3xl font-bold mb-3">{t.title}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">{t.subtitle}</p>
        </div>

        <h3 className="text-lg font-semibold mb-4">{t.assocTitle}</h3>
        <div className="grid sm:grid-cols-3 gap-4 mb-4">
          {t.assoc.map((item) => (
            <Card key={item.title} className="border-border/60">
              <CardContent className="p-5">
                <item.icon className="w-6 h-6 text-primary mb-3" aria-hidden="true" />
                <p className="font-semibold text-sm mb-1">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4 mb-12">{t.assocNote}</p>

        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Landmark className="w-5 h-5 text-primary" aria-hidden="true" />
          {t.classTitle}
        </h3>
        <ol className="space-y-3 mb-6">
          {t.steps.map((s) => (
            <li key={s.n}>
              <Card className="border-border/60">
                <CardContent className="p-4 flex gap-4">
                  <span className="text-primary font-bold text-lg shrink-0" aria-hidden="true">{s.n}</span>
                  <div>
                    <p className="font-semibold text-sm mb-1">{s.title}</p>
                    <p className="text-xs text-muted-foreground">{s.body}</p>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>

        <div className="grid md:grid-cols-2 gap-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6">
              <p className="text-xs text-muted-foreground mb-1">{t.durationLabel}</p>
              <p className="text-3xl font-bold text-primary">{t.durationValue}</p>
              <p className="text-xs text-muted-foreground mt-1">{t.durationNote}</p>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-primary" aria-hidden="true" />
                {t.weDoTitle}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {t.weDo.map((item) => (
                  <li key={item} className="flex gap-2">
                    <ClipboardCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8">
          <Button asChild size="lg" className="min-h-12">
            <a href="#call-15-min">{t.cta}</a>
          </Button>
          <p className="text-xs text-muted-foreground mt-4 max-w-2xl mx-auto">{t.disclaimer}</p>
        </div>
      </div>
    </section>
  );
};

export default OwnerAssociationPermits;
