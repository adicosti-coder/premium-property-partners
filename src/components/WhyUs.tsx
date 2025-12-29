import { CheckCircle2, Shield, Target, Zap } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useParallax } from "@/hooks/useParallax";

const WhyUs = () => {
  const { language } = useLanguage();
  const { offset: parallaxOffset1 } = useParallax({ speed: 0.12, direction: 'up' });
  const { offset: parallaxOffset2 } = useParallax({ speed: 0.08, direction: 'down' });

  const translations = {
    ro: {
      label: "AUTORITATE",
      title: "De ce te poți baza pe noi",
      brandName: "RealTrust • ApArt Hotel",
      brandSubtitle: "Timișoara · operare premium în regim hotelier",
      description: "Construim sisteme și standard: proceduri, checklists, QA, preț dinamic, poziționare și comunicare. Nu ne bazăm pe noroc sau pe un sezon bun. Construim un business repetabil.",
      promiseTitle: "Promisiune simplă",
      promiseText: "Îți spunem realist dacă merită. Dacă merită, îți dăm pași clari. Dacă nu merită, îți spunem de ce.",
      reasons: [
        "Experiență de peste 5 ani în administrare proprietăți",
        "Rata medie de ocupare de 95%+ pentru portofoliu",
        "Suport 24/7 pentru proprietari și oaspeți",
        "Fotografii și listări profesionale incluse",
        "Raportare lunară detaliată și transparentă"
      ],
      performanceLabel: "PERFORMANȚĂ MEDIE",
      revenueIncrease: "+45%",
      revenueDescription: "creștere venituri vs. chirie clasică",
      listingTime: "24h",
      listingTimeLabel: "timp de listare",
      commission: "15-20%",
      commissionLabel: "comision management"
    },
    en: {
      label: "AUTHORITY",
      title: "Why you can rely on us",
      brandName: "RealTrust • ApArt Hotel",
      brandSubtitle: "Timișoara · premium hotel-style operation",
      description: "We build systems and standards: procedures, checklists, QA, dynamic pricing, positioning and communication. We don't rely on 'luck' or a good season. We build a repeatable business.",
      promiseTitle: "Simple promise",
      promiseText: "We tell you realistically if it's worth it. If it is, we give you clear steps. If not, we tell you why.",
      reasons: [
        "Over 5 years of property management experience",
        "Average occupancy rate of 95%+ for portfolio",
        "24/7 support for owners and guests",
        "Professional photos and listings included",
        "Detailed and transparent monthly reporting"
      ],
      performanceLabel: "AVERAGE PERFORMANCE",
      revenueIncrease: "+45%",
      revenueDescription: "revenue increase vs. classic rent",
      listingTime: "24h",
      listingTimeLabel: "listing time",
      commission: "15-20%",
      commissionLabel: "management fee"
    }
  };

  const t = translations[language];

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
            <p className="text-gold uppercase tracking-widest text-sm font-semibold mb-4 font-sans">{t.label}</p>
            <h2 className="text-3xl md:text-4xl font-serif font-semibold text-cream mb-6">
              {t.title}
            </h2>
            
            {/* Brand Card */}
            <div className="bg-cream/5 backdrop-blur-sm rounded-xl p-6 border border-cream/10 mb-8">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gold/20 flex items-center justify-center">
                  <span className="text-gold font-serif font-bold text-lg">RT</span>
                </div>
                <div>
                  <p className="font-serif font-semibold text-cream">{t.brandName}</p>
                  <p className="text-cream/60 text-sm">{t.brandSubtitle}</p>
                </div>
              </div>
              <p className="text-cream/70 leading-relaxed font-sans text-sm">
                {t.description}
              </p>
            </div>

            {/* Promise Box */}
            <div className="bg-gold/10 border border-gold/20 rounded-xl p-5 mb-8">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-5 h-5 text-gold" />
                <span className="font-semibold text-gold">{t.promiseTitle}</span>
              </div>
              <p className="text-cream/80 font-sans text-sm leading-relaxed">
                {t.promiseText}
              </p>
            </div>
            
            <ul className="space-y-4">
              {t.reasons.map((reason, index) => (
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
                <p className="text-cream/60 text-sm uppercase tracking-widest mb-2 font-sans">{t.performanceLabel}</p>
                <p className="text-5xl md:text-6xl font-serif font-semibold text-gradient-gold">{t.revenueIncrease}</p>
                <p className="text-cream/70 mt-2 font-sans">{t.revenueDescription}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-6 pt-8 border-t border-cream/10">
                <div className="text-center">
                  <p className="text-2xl font-serif font-semibold text-cream">{t.listingTime}</p>
                  <p className="text-cream/50 text-sm font-sans">{t.listingTimeLabel}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-serif font-semibold text-cream">{t.commission}</p>
                  <p className="text-cream/50 text-sm font-sans">{t.commissionLabel}</p>
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