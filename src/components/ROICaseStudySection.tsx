import { useLanguage } from "@/i18n/LanguageContext";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { TrendingUp, Home, BarChart3 } from "lucide-react";

interface CaseStudy {
  type: string;
  typeEn: string;
  zone: string;
  classicRent: number;
  realtrustIncome: number;
  occupancy: number;
  roi: string;
}

const caseStudies: CaseStudy[] = [
  {
    type: "Studio 35m²",
    typeEn: "Studio 35m²",
    zone: "Centru / Piața Victoriei",
    classicRent: 350,
    realtrustIncome: 900,
    occupancy: 75,
    roi: "9.4%",
  },
  {
    type: "2 Camere 55m²",
    typeEn: "2 Rooms 55m²",
    zone: "Iulius Town / Dâmbovița",
    classicRent: 450,
    realtrustIncome: 1200,
    occupancy: 75,
    roi: "9.4%",
  },
  {
    type: "3 Camere 75m²",
    typeEn: "3 Rooms 75m²",
    zone: "Fabric / Aradului",
    classicRent: 550,
    realtrustIncome: 1600,
    occupancy: 75,
    roi: "9.4%",
  },
];

const ROICaseStudySection = () => {
  const { language } = useLanguage();
  const { ref, isVisible } = useScrollAnimation();

  const t = {
    ro: {
      badge: "Studii de Caz Reale",
      title: "Chirie Clasică vs. Management RealTrust",
      subtitle: "Date reale din portofoliul nostru din Timișoara — fără estimări, fără promisiuni exagerate.",
      classic: "Chirie Clasică",
      realtrust: "Cu RealTrust",
      perMonth: "/lună",
      occupancy: "Ocupare",
      increase: "creștere",
      roi: "ROI anual",
    },
    en: {
      badge: "Real Case Studies",
      title: "Classic Rent vs. RealTrust Management",
      subtitle: "Real data from our Timișoara portfolio — no estimates, no exaggerated promises.",
      classic: "Classic Rent",
      realtrust: "With RealTrust",
      perMonth: "/month",
      occupancy: "Occupancy",
      increase: "increase",
      roi: "Annual ROI",
    },
  };

  const text = t[language as keyof typeof t] || t.ro;

  return (
    <section
      ref={ref}
      className={`py-20 bg-secondary/30 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
    >
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold mb-4">
            <BarChart3 className="w-4 h-4" />
            {text.badge}
          </span>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-3">
            {text.title}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {text.subtitle}
          </p>
        </div>

        {/* Case Study Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {caseStudies.map((cs, i) => {
            const increase = Math.round(((cs.realtrustIncome - cs.classicRent) / cs.classicRent) * 100);
            
            return (
              <div
                key={i}
                className="bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/30 transition-all duration-500 hover:shadow-elegant"
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                {/* Header */}
                <div className="p-5 border-b border-border">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Home className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {language === "en" ? cs.typeEn : cs.type}
                      </h3>
                      <p className="text-xs text-muted-foreground">{cs.zone}</p>
                    </div>
                  </div>
                </div>

                {/* Comparison */}
                <div className="p-5 space-y-4">
                  {/* Classic Rent */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{text.classic}</span>
                    <span className="text-lg font-semibold text-muted-foreground line-through">
                      €{cs.classicRent}{text.perMonth}
                    </span>
                  </div>

                  {/* Increase badge */}
                  <div className="flex items-center justify-center">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-bold">
                      <TrendingUp className="w-4 h-4" />
                      +{increase}% {text.increase}
                    </div>
                  </div>

                  {/* RealTrust Income */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-primary">{text.realtrust}</span>
                    <span className="text-2xl font-bold text-primary">
                      €{cs.realtrustIncome}{text.perMonth}
                    </span>
                  </div>

                  {/* Bar comparison */}
                  <div className="space-y-2">
                    <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-muted-foreground/30 rounded-full transition-all duration-1000"
                        style={{ width: isVisible ? `${(cs.classicRent / cs.realtrustIncome) * 100}%` : "0%" }}
                      />
                    </div>
                    <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all"
                        style={{ 
                          width: isVisible ? "100%" : "0%", 
                          transitionDuration: "1500ms",
                          transitionDelay: "200ms" 
                        }}
                      />
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">{text.occupancy}</p>
                      <p className="text-sm font-bold text-foreground">{cs.occupancy}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">{text.roi}</p>
                      <p className="text-sm font-bold text-primary">{cs.roi}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ROICaseStudySection;
