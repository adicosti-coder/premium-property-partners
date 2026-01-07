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
    <section id="faq" className="section-padding bg-background relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-6 lg:px-8 relative z-10">
        <div 
          ref={headerRef}
          className={`text-center section-header-spacing transition-all duration-700 ${
            headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <HelpCircle className="w-4 h-4 text-primary" />
            <span className="text-primary text-sm font-semibold">{t.faq.badge}</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl heading-premium text-foreground mb-6">
            {t.faq.title} <span className="text-gradient-gold">{t.faq.titleHighlight}</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto text-premium">
            {t.faq.subtitle}
          </p>
        </div>

        <div 
          ref={contentRef}
          className={`max-w-3xl mx-auto transition-all duration-700 ${
            contentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <Accordion type="single" collapsible className="space-y-5">
            {t.faq.items.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="bg-card border border-border rounded-xl px-8 data-[state=open]:border-primary/30 transition-colors"
              >
                <AccordionTrigger className="text-left heading-premium text-foreground hover:text-primary py-6 text-lg">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-6 text-premium text-base">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Contact CTA */}
        <div 
          className={`mt-16 text-center transition-all duration-700 delay-200 ${
            contentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <p className="text-muted-foreground text-lg mb-5">
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