import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BadgeCheck, Building2, Linkedin, Mail, MapPin, MessageCircle, Phone, UserRound } from "lucide-react";
import { BRAND } from "@/lib/orgIdentity";
import { trackConversion } from "@/lib/conversionTracking";
import ceoImage from "@/assets/team/ceo.jpg";
import propertyManagerImage from "@/assets/team/property-manager.jpg";
import operationsImage from "@/assets/team/operations.jpg";
import guestRelationsImage from "@/assets/team/guest-relations.jpg";

/**
 * FounderProfile — "cine ești, cu față": fondatorul cu poză și telefon direct,
 * echipa operațională și datele legale ale firmei (CUI, adresă birou).
 * Componentă pur prezentațională.
 */

const PHONE_DISPLAY = "0799 069 256";
const WHATSAPP_URL =
  "https://wa.me/40799069256?text=" +
  encodeURIComponent("Bună Adrian! Vreau să discutăm despre administrarea apartamentului meu în regim hotelier.");

const FounderProfile = () => {
  const { language } = useLanguage();
  const isRo = language === "ro";

  const t = isRo
    ? {
        badge: "Cine suntem",
        title: "Discuți cu oameni reali, nu cu un call-center",
        subtitle:
          "Firma este din Timișoara, birou fizic în Cetate, cu o echipă care se ocupă zilnic de apartamente ca al tău.",
        founderRole: "Fondator & Administrator",
        founderBio:
          "Peste 10 ani în imobiliare în Timișoara. Preiau personal fiecare discuție de început: îți spun estimarea de venit, ce trebuie schimbat în apartament și dacă merită regim hotelier în zona ta.",
        founderPromise: "Răspund personal la telefon în timpul programului (L–V, 10:00–18:00).",
        visionTitle: "Viziunea și experiența locală",
        vision: [
          "Peste 10 ani în imobiliare exclusiv în Timișoara — cunosc tarifele reale pe fiecare zonă, de la Cetate și Iosefin până la Dumbrăvița și Aradului.",
          "Cred că un apartament administrat corect trebuie să bată chiria clasică cu cifre, nu cu promisiuni: ținta noastră de lucru este 9,4% randament net.",
          "Standard hotelier aplicat la scară mică: aceleași reguli de curățenie, comunicare și raportare pentru un apartament ca pentru un hotel.",
          "Preferăm un portofoliu mic și performant decât multe apartamente administrate superficial.",
        ],
        callBtn: "Sună direct",
        waBtn: "Scrie pe WhatsApp",
        bookBtn: "Rezervă un call de 15 min",
        teamTitle: "Echipa care se ocupă de apartamentul tău",
        legalTitle: "Date de identificare",
        legalNote: "Poți verifica firma oricând înainte să semnezi ceva.",
        labels: { company: "Firma", cui: "CUI", office: "Birou", contact: "Contact" },
        team: [
          { name: "Property Manager", role: "Relația cu proprietarii", desc: "Rapoarte lunare, prețuri, mentenanță.", image: propertyManagerImage },
          { name: "Operațiuni", role: "Curățenie & logistică", desc: "Lenjerie, consumabile, standard între rezervări.", image: operationsImage },
          { name: "Guest Relations", role: "Oaspeți 24/7", desc: "Check-in, mesaje, recenzii.", image: guestRelationsImage },
        ],
      }
    : {
        badge: "Who we are",
        title: "You talk to real people, not a call center",
        subtitle:
          "A Timișoara-based company with a physical office in Cetate and a team handling apartments like yours every day.",
        founderRole: "Founder & Managing Director",
        founderBio:
          "Over 10 years in Timișoara real estate. I personally take every first conversation: your income estimate, what needs changing in the apartment, and whether short-term rental makes sense in your area.",
        founderPromise: "I answer the phone personally during business hours (Mon–Fri, 10:00–18:00).",
        visionTitle: "Vision and local experience",
        vision: [
          "Over 10 years in real estate exclusively in Timișoara — I know the real rates per area, from Cetate and Iosefin to Dumbrăvița and Aradului.",
          "A properly managed apartment should beat long-term rent with numbers, not promises: our working target is 9.4% net yield.",
          "Hotel standards at small scale: the same cleaning, communication and reporting rules as a hotel.",
          "We prefer a small, high-performing portfolio over many loosely managed apartments.",
        ],
        callBtn: "Call directly",
        waBtn: "Message on WhatsApp",
        bookBtn: "Book a 15-min call",
        teamTitle: "The team handling your apartment",
        legalTitle: "Company details",
        legalNote: "You can verify the company any time before signing anything.",
        labels: { company: "Company", cui: "VAT ID", office: "Office", contact: "Contact" },
        team: [
          { name: "Property Manager", role: "Owner relations", desc: "Monthly reports, pricing, maintenance.", image: propertyManagerImage },
          { name: "Operations", role: "Cleaning & logistics", desc: "Linen, supplies, standards between stays.", image: operationsImage },
          { name: "Guest Relations", role: "Guests 24/7", desc: "Check-in, messages, reviews.", image: guestRelationsImage },
        ],
      };

  const address = `${BRAND.address.streetAddress}, ${BRAND.address.addressLocality} ${BRAND.address.postalCode}`;

  return (
    <section id="cine-suntem" className="py-16 md:py-20 bg-background scroll-mt-24">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-10">
          <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/5">
            <UserRound className="w-4 h-4 mr-2 text-primary" aria-hidden="true" />
            {t.badge}
          </Badge>
          <h2 className="text-2xl md:text-3xl font-bold mb-3">{t.title}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">{t.subtitle}</p>
        </div>

        <Card className="border-primary/15 overflow-hidden mb-10">
          <CardContent className="p-0">
            <div className="grid md:grid-cols-[280px_1fr]">
              <img
                src={ceoImage}
                alt={isRo ? "Adrian Costi, fondator RealTrust Timișoara" : "Adrian Costi, founder of RealTrust Timișoara"}
                width={560}
                height={640}
                loading="lazy"
                decoding="async"
                className="w-full h-64 md:h-full object-cover"
              />
              <div className="p-6 md:p-8">
                <h3 className="text-xl font-bold">Adrian Costi</h3>
                <p className="text-primary font-medium mb-4">{t.founderRole}</p>
                <p className="text-muted-foreground mb-4">{t.founderBio}</p>
                <p className="flex items-start gap-2 text-sm font-medium mb-6">
                  <BadgeCheck className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
                  {t.founderPromise}
                </p>

                <div className="flex flex-wrap gap-3">
                  <Button asChild size="lg" className="min-h-12">
                    <a
                      href={`tel:${BRAND.telephone}`}
                      aria-label={`${t.callBtn} ${PHONE_DISPLAY}`}
                      onClick={() => trackConversion({ event: "phone_click", source: "owners_founder_profile" })}
                    >
                      <Phone className="w-4 h-4 mr-2" aria-hidden="true" />
                      {t.callBtn}: {PHONE_DISPLAY}
                    </a>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="min-h-12">
                    <a
                      href={WHATSAPP_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={t.waBtn}
                      onClick={() => trackConversion({ event: "whatsapp_click", source: "owners_founder_profile" })}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" aria-hidden="true" />
                      {t.waBtn}
                    </a>
                  </Button>
                  <Button asChild variant="ghost" size="lg" className="min-h-12">
                    <a href="#call-15-min">{t.bookBtn}</a>
                  </Button>
                </div>

                <div className="flex flex-wrap gap-4 mt-6 text-sm">
                  <a
                    href="https://www.linkedin.com/in/costi-adrian-2b50931a"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                    aria-label="LinkedIn Adrian Costi"
                  >
                    <Linkedin className="w-4 h-4" aria-hidden="true" />
                    LinkedIn
                  </a>
                  <a
                    href="mailto:adrian@realtrust.ro"
                    className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                    aria-label={isRo ? "Trimite email lui Adrian Costi" : "Email Adrian Costi"}
                  >
                    <Mail className="w-4 h-4" aria-hidden="true" />
                    adrian@realtrust.ro
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <h3 className="text-lg font-semibold mb-4">{t.teamTitle}</h3>
        <div className="grid sm:grid-cols-3 gap-4 mb-10">
          {t.team.map((m) => (
            <Card key={m.name} className="border-border/60">
              <CardContent className="p-5 flex items-start gap-4">
                <img
                  src={m.image}
                  alt={`${m.name} — ${m.role} RealTrust Timișoara`}
                  width={112}
                  height={112}
                  loading="lazy"
                  decoding="async"
                  className="w-14 h-14 rounded-full object-cover shrink-0"
                />
                <div>
                  <p className="font-semibold text-sm">{m.name}</p>
                  <p className="text-primary text-xs font-medium mb-1">{m.role}</p>
                  <p className="text-muted-foreground text-xs">{m.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-muted/40 border-border/60">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-1 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" aria-hidden="true" />
              {t.legalTitle}
            </h3>
            <p className="text-xs text-muted-foreground mb-4">{t.legalNote}</p>
            <dl className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground text-xs">{t.labels.company}</dt>
                <dd className="font-medium">{BRAND.legalName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">{t.labels.cui}</dt>
                <dd className="font-medium">RO14380627</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">{t.labels.office}</dt>
                <dd className="font-medium inline-flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                  {address}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">{t.labels.contact}</dt>
                <dd className="font-medium">
                  {PHONE_DISPLAY} · {BRAND.email}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default FounderProfile;
