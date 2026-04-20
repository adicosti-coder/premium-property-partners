import { HelpCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useLanguage } from "@/i18n/LanguageContext";
import { useRegisterFAQs } from "@/hooks/useFAQSchema";

/**
 * FAQ specific for property owners — covers legal questions
 * (autorizație regim hotelier, legislație, contract management, daune).
 * Registers items into FAQPage JSON-LD via useRegisterFAQs.
 */
const OwnersFAQ = () => {
  const { language } = useLanguage();
  const lang = language === "en" ? "en" : "ro";

  const data = {
    ro: {
      title: "Întrebări Frecvente — Proprietari",
      subtitle: "Răspunsuri la cele mai importante întrebări despre administrarea în regim hotelier",
      items: [
        {
          q: "Ce autorizație de regim hotelier este necesară în Timișoara?",
          a: "Pentru operarea legală în regim hotelier ai nevoie de Certificat de Clasificare emis de Ministerul Antreprenoriatului și Turismului (1-5 stele/margarete), autorizație DSP (sanitară), aviz ISU (situații de urgență) și înregistrare la Primăria Timișoara pentru taxa hotelieră. RealTrust te ghidează pas cu pas în obținerea tuturor avizelor.",
        },
        {
          q: "Care este legislația pentru regim hotelier în România?",
          a: "Cadrul legal este reglementat de OG 58/1998 privind activitatea de turism, HG 1267/2010 (clasificare structuri de cazare) și Codul Fiscal (impozit pe venit 10% sau microîntreprindere 1-3%). Veniturile se declară prin PFA, SRL sau impozit pe venit din cedarea folosinței bunurilor. Recomandăm consultanță contabilă specializată — oferim partener de încredere.",
        },
        {
          q: "Care este durata minimă a contractului de property management?",
          a: "Contractul standard RealTrust este flexibil, fără perioadă minimă obligatorie. Poți renunța oricând cu un preaviz de 30 de zile. Această flexibilitate ne diferențiază de competiție și reflectă încrederea în calitatea serviciilor noastre.",
        },
        {
          q: "Cum se gestionează daunele provocate de oaspeți?",
          a: "Toate rezervările pe Booking.com și Airbnb includ AirCover/Booking Damage Protection (acoperire până la 3.000.000 USD pentru Airbnb, până la 6.500€ Booking). Suplimentar, percepem o garanție de daune (security deposit) de 100-300€ per rezervare și avem asigurare proprie pentru proprietățile administrate. Dauna este documentată foto/video și recuperată în 7-14 zile.",
        },
        {
          q: "Ce servicii de property management Timișoara oferă RealTrust?",
          a: "Pachet complet: listare multi-channel (Airbnb, Booking, Expedia), pricing dinamic AI, check-in/check-out automatizat (smart locks), curățenie profesională, schimbare lenjerie, mentenanță 24/7, suport oaspeți multilingv, rapoarte financiare lunare detaliate, fotografii profesionale și optimizare SEO listări.",
        },
        {
          q: "Ce taxe locale plătesc pentru regim hotelier în Timișoara?",
          a: "Taxa hotelieră locală în Timișoara este de 1% din valoarea cazării, colectată de la oaspete și virată lunar la Primărie. Suplimentar: impozit pe clădire (0.1-1.3% din valoarea impozabilă), taxa de salubritate și utilități. RealTrust gestionează declarațiile lunare pentru tine.",
        },
        {
          q: "În cât timp pot începe să generez venituri?",
          a: "Procesul de onboarding durează 5-7 zile lucrătoare: ședință foto profesională (ziua 1-2), configurare listări multi-platformă (ziua 3-4), instalare smart lock și verificare echipamente (ziua 5), go-live (ziua 6-7). Prima rezervare apare de obicei în primele 48 de ore după publicare.",
        },
      ],
    },
    en: {
      title: "Frequently Asked Questions — Owners",
      subtitle: "Answers to the most important questions about short-term rental management",
      items: [
        {
          q: "What short-term rental license is required in Timișoara?",
          a: "For legal operation you need: Classification Certificate from the Ministry of Tourism (1-5 stars), DSP (sanitary) authorization, ISU (fire safety) approval, and registration with Timișoara City Hall for the hotel tax. RealTrust guides you through the entire licensing process.",
        },
        {
          q: "What is the Romanian legislation for short-term rentals?",
          a: "The legal framework is regulated by GO 58/1998 on tourism activity, GD 1267/2010 (accommodation classification), and the Fiscal Code (10% income tax or 1-3% micro-company). Income is declared via self-employment, LLC, or property income tax. We recommend specialized accounting — we offer a trusted partner.",
        },
        {
          q: "What is the minimum property management contract duration?",
          a: "RealTrust's standard contract is flexible with no mandatory minimum period. You can opt out anytime with 30 days' notice. This flexibility differentiates us from competition and reflects confidence in our service quality.",
        },
        {
          q: "How are guest-caused damages handled?",
          a: "All Booking.com and Airbnb reservations include AirCover/Booking Damage Protection (up to $3M for Airbnb, up to €6,500 for Booking). Additionally, we charge a €100-300 security deposit per booking and carry our own insurance. Damages are documented photo/video and recovered within 7-14 days.",
        },
        {
          q: "What property management services does RealTrust offer in Timișoara?",
          a: "Full package: multi-channel listing (Airbnb, Booking, Expedia), AI dynamic pricing, automated check-in/out (smart locks), professional cleaning, linen change, 24/7 maintenance, multilingual guest support, detailed monthly financial reports, professional photography, and listing SEO optimization.",
        },
        {
          q: "What local taxes apply to short-term rentals in Timișoara?",
          a: "The local hotel tax in Timișoara is 1% of accommodation value, collected from guests and remitted monthly to City Hall. Additionally: building tax (0.1-1.3% of taxable value), waste collection fee, and utilities. RealTrust handles monthly declarations for you.",
        },
        {
          q: "How quickly can I start generating revenue?",
          a: "Onboarding takes 5-7 business days: professional photo session (day 1-2), multi-platform listing setup (day 3-4), smart lock installation and equipment check (day 5), go-live (day 6-7). First booking typically arrives within 48 hours after publication.",
        },
      ],
    },
  };

  const t = data[lang];

  // Register FAQ items into centralized FAQPage schema
  useRegisterFAQs(
    "owners-faq",
    t.items.map((item) => ({ question: item.q, answer: item.a })),
  );

  return (
    <section
      id="owners-faq"
      className="section-padding bg-background"
      aria-labelledby="owners-faq-heading"
    >
      <div className="container mx-auto px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <HelpCircle className="w-4 h-4 text-primary" />
            <span className="text-primary text-sm font-semibold">
              {lang === "ro" ? "Pentru proprietari" : "For owners"}
            </span>
          </div>
          <h2
            id="owners-faq-heading"
            className="text-3xl md:text-4xl lg:text-5xl heading-premium text-foreground mb-4"
          >
            {t.title}
          </h2>
          <p className="text-muted-foreground text-lg text-premium">{t.subtitle}</p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {t.items.map((item, i) => (
              <AccordionItem
                key={i}
                value={`owners-faq-${i}`}
                className="bg-card border border-border rounded-xl px-6 data-[state=open]:border-primary/30 transition-colors"
              >
                <AccordionTrigger className="text-left heading-premium text-foreground hover:text-primary py-5 text-base md:text-lg">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-foreground/70 dark:text-muted-foreground pb-5 text-premium text-base">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default OwnersFAQ;
