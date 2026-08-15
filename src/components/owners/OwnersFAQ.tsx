import { HelpCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useLanguage } from "@/i18n/LanguageContext";
import { useRegisterFAQs } from "@/hooks/useFAQSchema";
import { OWNERS_FAQ_DATA } from "@/data/ownersFaq";

/**
 * FAQ specific for property owners — covers legal questions
 * (autorizație regim hotelier, legislație, contract management, daune).
 * Registers items into FAQPage JSON-LD via useRegisterFAQs.
 */
const OwnersFAQ = () => {
  const { language } = useLanguage();
  const lang = language === "en" ? "en" : "ro";

  const t = OWNERS_FAQ_DATA[lang];

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
