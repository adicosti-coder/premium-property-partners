import { ClipboardCheck, Settings, BarChart3, Banknote } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useLanguage } from "@/i18n/LanguageContext";

const icons = [ClipboardCheck, Settings, BarChart3, Banknote];
const numbers = ["01", "02", "03", "04"];

const HowItWorks = () => {
  const { t } = useLanguage();
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: gridRef, isVisible: gridVisible } = useScrollAnimation({ threshold: 0.1 });

  return (
    <section id="cum-functioneaza" className="section-padding bg-background">
      <div className="container mx-auto px-6 lg:px-8">
        <div 
          ref={headerRef}
          className={`text-center section-header-spacing transition-all duration-700 ${
            headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <p className="text-gold uppercase tracking-widest text-sm font-semibold mb-6 font-sans">{t.howItWorks.label}</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl heading-premium text-foreground mb-6">
            {t.howItWorks.title}
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto text-premium">
            {t.howItWorks.subtitle}
          </p>
        </div>
        
        <div className="max-w-5xl mx-auto">
          <div ref={gridRef} className="grid md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">
            {t.howItWorks.steps.map((step, index) => {
              const Icon = icons[index];
              return (
                <div 
                  key={index} 
                  className={`relative group transition-all duration-500 ${
                    gridVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                  }`}
                  style={{ transitionDelay: gridVisible ? `${index * 100}ms` : '0ms' }}
                >
                  {/* Connector line (hidden on last item) */}
                  {index < 3 && (
                    <div className="hidden lg:block absolute top-12 left-[60%] w-full h-px bg-gradient-to-r from-border to-transparent" />
                  )}
                  
                  <div className="text-center">
                    {/* Number badge */}
                    <div className="relative inline-flex items-center justify-center mb-8">
                      <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary transition-colors duration-300">
                        <Icon className="w-10 h-10 text-primary group-hover:text-cream transition-colors duration-300" />
                      </div>
                      <span className="absolute -top-2 -right-2 w-9 h-9 rounded-full bg-gold text-primary text-sm font-bold flex items-center justify-center font-sans">
                        {numbers[index]}
                      </span>
                    </div>
                    
                    <h3 className="text-lg lg:text-xl heading-premium text-foreground mb-3">
                      {step.title}
                    </h3>
                    
                    <p className="text-muted-foreground text-sm text-premium">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;