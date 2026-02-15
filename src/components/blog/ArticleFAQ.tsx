import { useLanguage } from "@/i18n/LanguageContext";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

/**
 * Auto-generated FAQ for blog articles based on category.
 * Outputs FAQPage microdata for Google + AI search snippets.
 */

interface ArticleFAQProps {
  category: string;
  articleTitle: string;
}

const faqData: Record<string, { ro: { q: string; a: string }[]; en: { q: string; a: string }[] }> = {
  "Management": {
    ro: [
      { q: "Cât costă administrarea unui apartament în regim hotelier?", a: "Comisionul standard este de 15-20% din veniturile generate, fără costuri ascunse. Modelul bazat pe comision ne motivează să maximizăm gradul de ocupare." },
      { q: "Ce platforme de rezervare folosiți?", a: "Listăm proprietățile pe Airbnb, Booking.com, Expedia și pe site-ul propriu. Multi-channel distribution maximizează vizibilitatea și ocuparea." },
      { q: "Cum funcționează check-in-ul pentru oaspeți?", a: "Folosim self check-in cu smart lock — oaspeții primesc codul automat pe WhatsApp. Nu este nevoie de prezență fizică." },
    ],
    en: [
      { q: "How much does short-term rental management cost?", a: "The standard fee is 15-20% of generated revenue, with no hidden costs. Our commission-based model motivates us to maximize occupancy." },
      { q: "What booking platforms do you use?", a: "We list properties on Airbnb, Booking.com, Expedia, and our own website. Multi-channel distribution maximizes visibility and occupancy." },
      { q: "How does guest check-in work?", a: "We use self check-in with smart locks — guests receive the code automatically via WhatsApp. No physical presence needed." },
    ],
  },
  "Investiții": {
    ro: [
      { q: "Ce randament pot obține dintr-un apartament în Timișoara?", a: "Randamentul net mediu este de 9.2-9.4% pe an pentru proprietățile administrate profesional, cu o rată de ocupare de peste 85%." },
      { q: "Merită să investesc în regim hotelier vs. chirie pe termen lung?", a: "Da, regimul hotelier generează în medie cu 40-60% mai mult venit decât chiria pe termen lung, deși implică management activ — pe care noi îl oferim." },
      { q: "Care sunt costurile ascunse ale investiției?", a: "Transparența este cheia: comision management 15-20%, comisioane platforme 15-23%, utilități, mentenanță periodică. Toate sunt detaliate în rapoartele lunare." },
    ],
    en: [
      { q: "What return can I expect from an apartment in Timișoara?", a: "Average net yield is 9.2-9.4% per year for professionally managed properties, with an occupancy rate above 85%." },
      { q: "Is short-term rental worth it vs. long-term lease?", a: "Yes, short-term rentals generate 40-60% more revenue on average than long-term leases, though they require active management — which we provide." },
      { q: "What are the hidden costs of investing?", a: "Transparency is key: 15-20% management fee, 15-23% platform commissions, utilities, periodic maintenance. All detailed in monthly reports." },
    ],
  },
  "Financiar": {
    ro: [
      { q: "Ce taxe plătesc pentru veniturile din regim hotelier?", a: "Veniturile se impozitează conform regimului fiscal ales (PFA, SRL sau impozit pe venit). Recomandăm consultarea unui contabil specializat." },
      { q: "Cum primesc banii din închiriere?", a: "Plățile sunt virate direct în contul proprietarului, lunar, însoțite de un raport financiar detaliat cu toate veniturile și cheltuielile." },
    ],
    en: [
      { q: "What taxes do I pay on short-term rental income?", a: "Income is taxed according to your chosen fiscal regime (self-employed, LLC, or income tax). We recommend consulting a specialized accountant." },
      { q: "How do I receive rental payments?", a: "Payments are transferred directly to the owner's account monthly, accompanied by a detailed financial report with all revenues and expenses." },
    ],
  },
};

// Default FAQ for categories without specific data
const defaultFaq = {
  ro: [
    { q: "Ce face RealTrust diferit de alți administratori?", a: "Oferim transparență totală, tehnologie avansată (smart locks, pricing dinamic), echipă dedicată și rată de ocupare medie de peste 85%." },
    { q: "Cât durează procesul de onboarding?", a: "Procesul complet de listare a unei proprietăți noi durează 5-7 zile lucrătoare, incluzând ședința foto, configurarea listărilor și verificarea echipamentelor." },
    { q: "Pot folosi apartamentul personal în timpul anului?", a: "Absolut! Poți bloca oricâte perioade dorești pentru uz personal. Flexibilitatea este un principiu fundamental al colaborării noastre." },
  ],
  en: [
    { q: "What makes RealTrust different from other managers?", a: "We offer full transparency, advanced technology (smart locks, dynamic pricing), a dedicated team, and an average occupancy rate above 85%." },
    { q: "How long does the onboarding process take?", a: "The complete listing process takes 5-7 business days, including photo session, listing setup, and equipment verification." },
    { q: "Can I use my apartment personally during the year?", a: "Absolutely! You can block any periods you wish for personal use. Flexibility is a core principle of our collaboration." },
  ],
};

const ArticleFAQ = ({ category, articleTitle }: ArticleFAQProps) => {
  const { language } = useLanguage();
  const lang = language === "en" ? "en" : "ro";

  const items = faqData[category]?.[lang] || defaultFaq[lang];

  return (
    <section className="my-10 p-6 rounded-xl border border-border bg-muted/20" itemScope itemType="https://schema.org/FAQPage">
      <div className="flex items-center gap-2 mb-4">
        <HelpCircle className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-serif font-semibold">
          {lang === "ro" ? "Întrebări frecvente" : "Frequently Asked Questions"}
        </h2>
      </div>
      <Accordion type="single" collapsible className="w-full">
        {items.map((item, i) => (
          <AccordionItem
            key={i}
            value={`article-faq-${i}`}
            itemScope
            itemProp="mainEntity"
            itemType="https://schema.org/Question"
          >
            <AccordionTrigger className="text-left text-sm" itemProp="name">
              {item.q}
            </AccordionTrigger>
            <AccordionContent
              itemScope
              itemProp="acceptedAnswer"
              itemType="https://schema.org/Answer"
            >
              <p itemProp="text" className="text-sm text-muted-foreground">{item.a}</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
};

export default ArticleFAQ;
