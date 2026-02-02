import { Award, TrendingUp, HeartHandshake, Camera, FileText, Shield, type LucideIcon } from "lucide-react";

const reasonIcons: LucideIcon[] = [Award, TrendingUp, HeartHandshake, Camera, FileText];
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
        "Experiență de peste 25 ani în administrarea de proprietăți",
        "Rata medie de ocupare maximizată pentru proprietățile preluate",
        "Suport pentru proprietari și oaspeți",
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
        "Over 25 years of property management experience",
        "Maximized occupancy rate for managed properties",
        "Support for owners and guests",
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
    <section className="section-padding bg-background relative overflow-hidden">
      {/* Decorative elements with parallax - offset to prevent edge overflow */}
      <div 
        className="absolute top-0 -right-48 w-96 h-96 bg-primary/5 rounded-full blur-3xl transition-transform duration-100"
        style={{ transform: `translateY(${parallaxOffset1}px)` }}
      />
      <div 
        className="absolute bottom-0 -left-48 w-96 h-96 bg-primary/5 rounded-full blur-3xl transition-transform duration-100"
        style={{ transform: `translateY(${parallaxOffset2}px)` }}
      />
      
      <div className="container mx-auto px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center max-w-6xl mx-auto">
          {/* Content */}
          <div>
            <p className="text-primary tracking-widest text-sm font-semibold mb-6 font-sans">{t.label}</p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl heading-premium text-foreground mb-8">
              {t.title}
            </h2>
            
            {/* Brand Card */}
            <div className="bg-card backdrop-blur-sm rounded-xl p-6 border border-border mb-8">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <span className="text-primary font-serif font-bold text-lg">RT</span>
                </div>
                <div>
                  <p className="font-serif font-semibold text-foreground">{t.brandName}</p>
                  <p className="text-muted-foreground text-sm">{t.brandSubtitle}</p>
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed font-sans text-sm">
                {t.description}
              </p>
            </div>

            {/* Promise Box */}
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-5 mb-8">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-5 h-5 text-primary" />
                <span className="font-semibold text-primary">{t.promiseTitle}</span>
              </div>
              <p className="text-foreground/80 font-sans text-sm leading-relaxed">
                {t.promiseText}
              </p>
            </div>
            
            <ul className="space-y-4">
              {t.reasons.map((reason, index) => {
                const Icon = reasonIcons[index];
                return (
                  <li 
                    key={index} 
                    className="flex items-start gap-3 text-foreground/80 font-sans"
                  >
                    <Icon className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>{reason}</span>
                  </li>
                );
              })}
            </ul>
          </div>
          
          {/* Stats card */}
          <div className="relative">
            <div className="bg-card backdrop-blur-sm rounded-3xl p-10 border border-border">
              <div className="text-center mb-8">
                <p className="text-muted-foreground text-sm uppercase tracking-widest mb-2 font-sans">{t.performanceLabel}</p>
                <p className="text-5xl md:text-6xl font-serif font-semibold text-gradient-gold">{t.revenueIncrease}</p>
                <p className="text-muted-foreground mt-2 font-sans">{t.revenueDescription}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-6 pt-8 border-t border-border">
                <div className="text-center">
                  <p className="text-2xl font-serif font-semibold text-foreground">{t.listingTime}</p>
                  <p className="text-muted-foreground text-sm font-sans">{t.listingTimeLabel}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-serif font-semibold text-foreground">{t.commission}</p>
                  <p className="text-muted-foreground text-sm font-sans">{t.commissionLabel}</p>
                </div>
              </div>
            </div>
            
            {/* Floating accent */}
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-primary/20 rounded-full blur-2xl" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyUs;