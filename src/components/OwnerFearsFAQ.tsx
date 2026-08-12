import { ShieldCheck } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useLanguage } from "@/i18n/LanguageContext";
import { useRegisterFAQs } from "@/hooks/useFAQSchema";

/**
 * Objection-handling FAQ aimed at the owner's real fears (damage, unpaid rent,
 * being locked into a contract). Registered into the page-level FAQPage JSON-LD
 * so the visible accordion stays the single source of truth for the rich result.
 */
const COPY = {
  ro: {
    badge: "Îngrijorările proprietarilor, pe față",
    title: "Ce se întâmplă dacă",
    titleHighlight: "ceva merge prost?",
    subtitle:
      "Cele mai frecvente temeri înainte de a da apartamentul în administrare — și exact cum le acoperim contractual.",
    items: [
      {
        question: "Cine plătește dacă un oaspete îmi degradează apartamentul?",
        answer:
          "Noi. Fiecare rezervare trece prin verificarea oaspetelui, iar platformele (Booking, Airbnb) adaugă propriile garanții pentru daune. Peste asta, facem inventar fotografiat la fiecare check-out, iar reparațiile minore intră în costul nostru operațional, nu pe factura ta. Pentru daune majore activăm asigurarea și îți raportăm în aceeași zi.",
      },
      {
        question: "Ce se întâmplă dacă apartamentul stă gol o lună?",
        answer:
          "Nu îți cerem abonament fix: încasăm comision doar din venitul realizat. Dacă apartamentul nu produce, nu plătești administrare — de aceea interesul nostru este ocuparea, nu semnătura ta. Media portofoliului nostru este 75% ocupare, iar în lunile slabe compensăm cu tarife dinamice și rezervări corporate.",
      },
      {
        question: "Risc să nu îmi primesc banii, ca la chiriașii pe termen lung?",
        answer:
          "Nu există risc de chiriaș care nu plătește: oaspeții achită înainte de cazare, direct pe platformă. Tu primești transfer lunar, cu raport detaliat pe fiecare noapte încasată, comisioane și cheltuieli. Fără urmăriri, fără evacuări, fără luni pierdute în instanță.",
      },
      {
        question: "Sunt legat pe termen lung sau pot renunța?",
        answer:
          "Contractul este flexibil, cu preaviz de 30 de zile și fără penalități de ieșire. Rezervările deja confirmate se onorează, apoi îți predăm apartamentul, cheile și accesul la conturi. Poți începe și cu o perioadă de test de 3 luni, exact ca să vezi cifrele reale înainte de orice angajament.",
      },
      {
        question: "Vreau să folosesc apartamentul personal câteva săptămâni pe an. Se poate?",
        answer:
          "Da. Îți blochezi în calendar perioadele dorite, ideal cu 30 de zile înainte, ca să nu suprapunem rezervări. Mulți proprietari își păstrează sărbătorile sau concediile și lasă restul anului în regim hotelier.",
      },
      {
        question: "Cât durează până apartamentul începe să producă?",
        answer:
          "În mod obișnuit 7–14 zile: evaluare și estimare de randament, sesiune foto profesională, listare pe canale, montare self check-in. Prima încasare vine de regulă în prima lună de listare.",
      },
    ],
  },
  en: {
    badge: "Owner concerns, answered",
    title: "What happens if",
    titleHighlight: "something goes wrong?",
    subtitle:
      "The most common fears before handing over an apartment — and exactly how we cover them contractually.",
    items: [
      {
        question: "Who pays if a guest damages my apartment?",
        answer:
          "We do. Every booking goes through guest verification, and the platforms (Booking, Airbnb) add their own damage guarantees. On top of that we run a photo inventory at each check-out; minor repairs are part of our operating cost, not your invoice. For major damage we activate insurance and report to you the same day.",
      },
      {
        question: "What if the apartment stays empty for a month?",
        answer:
          "There is no fixed subscription: we only take a commission on realised revenue. If the apartment earns nothing, you pay no management fee — which is why our incentive is occupancy, not your signature. Our portfolio averages 75% occupancy, and we offset weak months with dynamic pricing and corporate bookings.",
      },
      {
        question: "Could I end up not being paid, like with long-term tenants?",
        answer:
          "There is no non-paying tenant risk: guests pay before check-in, directly on the platform. You receive a monthly transfer with a detailed report of every night booked, platform fees and expenses. No chasing, no evictions, no months lost in court.",
      },
      {
        question: "Am I locked in, or can I stop?",
        answer:
          "The contract is flexible: 30 days' notice, no exit penalties. Confirmed bookings are honoured, then we hand back the apartment, keys and account access. You can also start with a 3-month trial to see real numbers before committing.",
      },
      {
        question: "I want to use the apartment myself a few weeks a year. Is that possible?",
        answer:
          "Yes. You block your dates in the calendar, ideally 30 days ahead so we don't overlap bookings. Many owners keep holidays for themselves and leave the rest of the year in short-term rental.",
      },
      {
        question: "How long until the apartment starts earning?",
        answer:
          "Typically 7–14 days: valuation and yield estimate, professional photo session, channel listings, self check-in installation. The first payout usually lands within the first month of listing.",
      },
    ],
  },
} as const;

const OwnerFearsFAQ = () => {
  const { language } = useLanguage();
  const copy = language === "en" ? COPY.en : COPY.ro;

  useRegisterFAQs("homepage-owner-fears", copy.items as unknown as { question: string; answer: string }[]);

  return (
    <section id="intrebari-proprietari" className="faq-section section-padding bg-muted/30 scroll-mt-24">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="text-center section-header-spacing">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <ShieldCheck className="w-4 h-4 text-primary" aria-hidden="true" />
            <span className="text-primary text-sm font-semibold">{copy.badge}</span>
          </div>
          <h2 className="text-3xl md:text-4xl heading-premium text-foreground mb-4">
            {copy.title} <span className="text-gradient-gold">{copy.titleHighlight}</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto text-premium">{copy.subtitle}</p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {copy.items.map((item, index) => (
              <AccordionItem
                key={item.question}
                value={`owner-fear-${index}`}
                className="bg-card border border-border rounded-xl px-6 data-[state=open]:border-primary/30 transition-colors"
              >
                <AccordionTrigger className="text-left heading-premium text-foreground hover:text-primary py-5 text-base md:text-lg">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-foreground/70 dark:text-muted-foreground pb-5 text-premium text-base">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default OwnerFearsFAQ;
