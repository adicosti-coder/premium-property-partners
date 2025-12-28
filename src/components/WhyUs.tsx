import { CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useParallax } from "@/hooks/useParallax";

const WhyUs = () => {
  const { t } = useLanguage();
  const { offset: parallaxOffset1 } = useParallax({ speed: 0.12, direction: 'up' });
  const { offset: parallaxOffset2 } = useParallax({ speed: 0.08, direction: 'down' });

  return (
    <section className="py-24 bg-hero relative overflow-hidden">
      {/* Decorative elements with parallax */}
      <div 
        className="absolute top-0 right-0 w-96 h-96 bg-gold/5 rounded-full blur-3xl transition-transform duration-100"
        style={{ transform: `translateY(${parallaxOffset1}px)` }}
      />
      <div 
        className="absolute bottom-0 left-0 w-96 h-96 bg-gold/5 rounded-full blur-3xl transition-transform duration-100"
        style={{ transform: `translateY(${parallaxOffset2}px)` }}
      />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
          {/* Content */}
          <div>
            <p className="text-gold uppercase tracking-widest text-sm font-semibold mb-4 font-sans">{t.whyUs.label}</p>
            <h2 className="text-3xl md:text-4xl font-serif font-semibold text-cream mb-6">
              {t.whyUs.title}
            </h2>
            <p className="text-cream/70 mb-10 leading-relaxed font-sans">
              {t.whyUs.description}
            </p>
            
            <ul className="space-y-4">
              {t.whyUs.reasons.map((reason, index) => (
                <li 
                  key={index} 
                  className="flex items-start gap-3 text-cream/80 font-sans"
                >
                  <CheckCircle2 className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Stats card */}
          <div className="relative">
            <div className="bg-cream/5 backdrop-blur-sm rounded-3xl p-10 border border-cream/10">
              <div className="text-center mb-8">
                <p className="text-cream/60 text-sm uppercase tracking-widest mb-2 font-sans">{t.whyUs.performanceLabel}</p>
                <p className="text-5xl md:text-6xl font-serif font-semibold text-gradient-gold">{t.whyUs.revenueIncrease}</p>
                <p className="text-cream/70 mt-2 font-sans">{t.whyUs.revenueDescription}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-6 pt-8 border-t border-cream/10">
                <div className="text-center">
                  <p className="text-2xl font-serif font-semibold text-cream">{t.whyUs.listingTime}</p>
                  <p className="text-cream/50 text-sm font-sans">{t.whyUs.listingTimeLabel}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-serif font-semibold text-cream">{t.whyUs.commission}</p>
                  <p className="text-cream/50 text-sm font-sans">{t.whyUs.commissionLabel}</p>
                </div>
              </div>
            </div>
            
            {/* Floating accent */}
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-gold/20 rounded-full blur-2xl" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyUs;