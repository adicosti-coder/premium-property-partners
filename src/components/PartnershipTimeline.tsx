import { useLanguage } from "@/i18n/LanguageContext";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { 
  ClipboardCheck, 
  Camera, 
  Sparkles, 
  Settings, 
  Rocket,
  ArrowRight,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";

const PartnershipTimeline = () => {
  const { language } = useLanguage();
  const { ref, isVisible } = useScrollAnimation();

  const translations = {
    ro: {
      badge: "Procesul nostru",
      title: "Cronologia parteneriatului",
      subtitle: "De la prima întâlnire până la primele încasări – fiecare pas este optimizat pentru succesul tău",
      whatWeDo: "Ce facem",
      result: "Rezultat",
      steps: [
        {
          icon: ClipboardCheck,
          title: "Evaluare & Consultanță",
          description: "Analizăm proprietatea, potențialul de venit și stabilim strategia optimă de preț împreună.",
          result: "Plan personalizat de management"
        },
        {
          icon: Sparkles,
          title: "Pregătire profesională",
          description: "Curățenie profundă, aranjamente și amenajări minore pentru a maximiza atractivitatea.",
          result: "Proprietate pregătită 5 stele"
        },
        {
          icon: Camera,
          title: "Ședință foto & Copywriting",
          description: "Fotografii profesionale și descrieri optimizate SEO pentru toate platformele.",
          result: "Anunț premium cu vizibilitate maximă"
        },
        {
          icon: Settings,
          title: "Implementare sistem",
          description: "Integrare software, calendar sincronizat, prețuri dinamice și ghid digital pentru oaspeți.",
          result: "Automatizare completă"
        },
        {
          icon: Rocket,
          title: "Lansare & Management activ",
          description: "Publicare pe toate platformele, comunicare 24/7 cu oaspeții și rapoarte lunare.",
          result: "Încasări în contul tău"
        }
      ]
    },
    en: {
      badge: "Our process",
      title: "Partnership Timeline",
      subtitle: "From first meeting to first earnings – every step is optimized for your success",
      whatWeDo: "What we do",
      result: "Result",
      steps: [
        {
          icon: ClipboardCheck,
          title: "Evaluation & Consulting",
          description: "We analyze the property, income potential and establish the optimal pricing strategy together.",
          result: "Personalized management plan"
        },
        {
          icon: Sparkles,
          title: "Professional preparation",
          description: "Deep cleaning, arrangements and minor improvements to maximize attractiveness.",
          result: "5-star ready property"
        },
        {
          icon: Camera,
          title: "Photo shoot & Copywriting",
          description: "Professional photos and SEO-optimized descriptions for all platforms.",
          result: "Premium listing with maximum visibility"
        },
        {
          icon: Settings,
          title: "System implementation",
          description: "Software integration, synced calendar, dynamic pricing and digital guest guide.",
          result: "Complete automation"
        },
        {
          icon: Rocket,
          title: "Launch & Active management",
          description: "Publishing on all platforms, 24/7 guest communication and monthly reports.",
          result: "Earnings in your account"
        }
      ]
    }
  };

  const tr = translations[language] || translations.ro;

  return (
    <section 
      ref={ref}
      className="py-20 md:py-28 bg-gradient-to-b from-background via-secondary/20 to-background relative overflow-hidden"
    >
      {/* Decorative elements */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div 
          className={cn(
            "text-center mb-16 transition-all duration-700",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4 border border-primary/20">
            {tr.badge}
          </span>
          <h2 className="font-playfair text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            {tr.title}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            {tr.subtitle}
          </p>
        </div>

        {/* Desktop Timeline - Horizontal */}
        <div className="hidden lg:block">
          {/* Connection line */}
          <div className="relative mb-8">
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-primary/20 via-primary to-primary/20 transform -translate-y-1/2 rounded-full" />
            
            {/* Steps */}
            <div className="grid grid-cols-5 gap-4 relative">
              {tr.steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div
                    key={index}
                    className={cn(
                      "flex flex-col items-center transition-all duration-700",
                      isVisible 
                        ? "opacity-100 translate-y-0" 
                        : "opacity-0 translate-y-8"
                    )}
                    style={{ transitionDelay: `${index * 150}ms` }}
                  >
                    {/* Step number & icon circle */}
                    <div className="relative mb-6">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-gold flex items-center justify-center shadow-lg shadow-primary/30 group hover:scale-110 transition-transform duration-300">
                        <Icon className="w-9 h-9 text-primary-foreground" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-background border-2 border-primary flex items-center justify-center text-sm font-bold text-primary">
                        {index + 1}
                      </div>
                    </div>

                    {/* Content card */}
                    <div className="bg-card border border-border rounded-xl p-5 text-center h-full hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 group">
                      <h3 className="font-semibold text-foreground text-lg mb-3 group-hover:text-primary transition-colors">
                        {step.title}
                      </h3>
                      
                      <div className="space-y-4">
                        <div>
                          <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                            {tr.whatWeDo}
                          </span>
                          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                            {step.description}
                          </p>
                        </div>
                        
                        <div className="pt-3 border-t border-border">
                          <span className="text-xs uppercase tracking-wider text-primary font-medium">
                            {tr.result}
                          </span>
                          <div className="flex items-center justify-center gap-2 mt-2">
                            <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                            <span className="text-sm font-medium text-foreground">
                              {step.result}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mobile/Tablet Timeline - Vertical */}
        <div className="lg:hidden space-y-6">
          {tr.steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={index}
                className={cn(
                  "relative flex gap-4 transition-all duration-700",
                  isVisible 
                    ? "opacity-100 translate-x-0" 
                    : "opacity-0 -translate-x-8"
                )}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                {/* Left side - Timeline */}
                <div className="flex flex-col items-center">
                  {/* Icon circle */}
                  <div className="relative">
                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-primary to-gold flex items-center justify-center shadow-lg shadow-primary/30">
                      <Icon className="w-6 h-6 md:w-7 md:h-7 text-primary-foreground" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-background border-2 border-primary flex items-center justify-center text-xs font-bold text-primary">
                      {index + 1}
                    </div>
                  </div>
                  
                  {/* Vertical line */}
                  {index < tr.steps.length - 1 && (
                    <div className="w-0.5 flex-1 bg-gradient-to-b from-primary to-primary/20 my-3" />
                  )}
                </div>

                {/* Right side - Content */}
                <div className="flex-1 pb-6">
                  <div className="bg-card border border-border rounded-xl p-4 md:p-5 hover:border-primary/50 transition-all duration-300">
                    <h3 className="font-semibold text-foreground text-base md:text-lg mb-3">
                      {step.title}
                    </h3>
                    
                    <div className="space-y-3">
                      <div>
                        <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                          {tr.whatWeDo}
                        </span>
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                      
                      <div className="pt-3 border-t border-border">
                        <span className="text-xs uppercase tracking-wider text-primary font-medium">
                          {tr.result}
                        </span>
                        <div className="flex items-center gap-2 mt-2">
                          <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                          <span className="text-sm font-medium text-foreground">
                            {step.result}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA at bottom */}
        <div 
          className={cn(
            "text-center mt-12 transition-all duration-700 delay-500",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          <a
            href="#proprietari"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-primary to-gold text-primary-foreground rounded-full font-semibold hover:shadow-lg hover:shadow-primary/30 hover:scale-105 transition-all duration-300"
          >
            {language === "ro" ? "Începe parteneriatul" : "Start partnership"}
            <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      </div>
    </section>
  );
};

export default PartnershipTimeline;