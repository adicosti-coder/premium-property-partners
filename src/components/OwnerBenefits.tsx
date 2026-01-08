import { 
  Camera, 
  TrendingUp, 
  Shield, 
  Clock, 
  BarChart3, 
  Headphones,
  Sparkles,
  CalendarCheck
} from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useLanguage } from "@/i18n/LanguageContext";
import { useParallax } from "@/hooks/useParallax";

const icons = [Camera, TrendingUp, Shield, Clock, BarChart3, Headphones, Sparkles, CalendarCheck];

const OwnerBenefits = () => {
  const { t } = useLanguage();
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: gridRef, isVisible: gridVisible } = useScrollAnimation({ threshold: 0.05 });
  const { ref: ctaRef, isVisible: ctaVisible } = useScrollAnimation();
  const { offset: parallaxOffset1 } = useParallax({ speed: 0.15, direction: 'up' });
  const { offset: parallaxOffset2 } = useParallax({ speed: 0.1, direction: 'down' });

  return (
    <section className="py-24 bg-secondary relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-full h-full" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }} />
      </div>
      
      {/* Decorative elements with parallax */}
      <div 
        className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl transition-transform duration-100"
        style={{ transform: `translateY(${parallaxOffset1}px)` }}
      />
      <div 
        className="absolute bottom-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl transition-transform duration-100"
        style={{ transform: `translateY(${parallaxOffset2}px)` }}
      />
      
      <div className="container mx-auto px-6 relative z-10">
        <div 
          ref={headerRef}
          className={`text-center mb-16 transition-all duration-700 ${
            headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <p className="text-primary tracking-widest text-sm font-semibold mb-4">
            {t.ownerBenefits.label}
          </p>
          <h2 className="text-3xl md:text-4xl font-serif font-semibold text-foreground mb-4">
            {t.ownerBenefits.title} <span className="text-gradient-gold">{t.ownerBenefits.titleHighlight}</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t.ownerBenefits.subtitle}
          </p>
        </div>

        <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {t.ownerBenefits.items.map((benefit, index) => {
            const Icon = icons[index];
            return (
              <div
                key={index}
                className={`group bg-card backdrop-blur-sm rounded-2xl p-6 border border-border hover:border-primary/30 transition-all duration-500 hover:shadow-elegant ${
                  gridVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: gridVisible ? `${index * 75}ms` : '0ms' }}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {benefit.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div 
          ref={ctaRef}
          className={`mt-16 text-center transition-all duration-700 ${
            ctaVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary/10 border border-primary/20">
            <span className="text-foreground font-medium">{t.ownerBenefits.commission}</span>
            <span className="text-2xl font-serif font-bold text-primary">{t.ownerBenefits.commissionValue}</span>
            <span className="text-foreground font-medium">{t.ownerBenefits.commissionSuffix}</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OwnerBenefits;