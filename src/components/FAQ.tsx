import { HelpCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useLanguage } from "@/i18n/LanguageContext";

const FAQ = () => {
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: contentRef, isVisible: contentVisible } = useScrollAnimation({ threshold: 0.05 });
  const { t } = useLanguage();

  return (
    <section id="faq" className="py-24 bg-background relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-6 relative z-10">
        <div 
          ref={headerRef}
          className={`text-center mb-16 transition-all duration-700 ${
            headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <HelpCircle className="w-4 h-4 text-primary" />
            <span className="text-primary text-sm font-semibold">{t.faq.badge}</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-serif font-semibold text-foreground mb-4">
            {t.faq.title} <span className="text-gradient-gold">{t.faq.titleHighlight}</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t.faq.subtitle}
          </p>
        </div>

        <div 
          ref={contentRef}
          className={`max-w-3xl mx-auto transition-all duration-700 ${
            contentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <Accordion type="single" collapsible className="space-y-4">
            {t.faq.items.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="bg-card border border-border rounded-xl px-6 data-[state=open]:border-primary/30 transition-colors"
              >
                <AccordionTrigger className="text-left font-serif font-semibold text-foreground hover:text-primary py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Contact CTA */}
        <div 
          className={`mt-12 text-center transition-all duration-700 delay-200 ${
            contentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <p className="text-muted-foreground mb-4">
            {t.faq.notFound}
          </p>
          <a 
            href="#contact" 
            className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            {t.faq.contactUs}
            <span className="text-lg">→</span>
          </a>
        </div>
      </div>
    </section>
  );
};

export default FAQ;