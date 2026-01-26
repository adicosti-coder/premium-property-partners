import { 
  TrendingUp, 
  Sparkles, 
  MessageSquare, 
  Wrench, 
  BarChart3, 
  ShieldCheck 
} from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useLanguage } from "@/i18n/LanguageContext";

const ServiceGuaranteesGrid = () => {
  const { language } = useLanguage();
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: gridRef, isVisible: gridVisible } = useScrollAnimation({ threshold: 0.1 });

  const guarantees = [
    {
      icon: TrendingUp,
      labelRo: "Pricing",
      labelEn: "Pricing",
      titleRo: "Preț optim zilnic",
      titleEn: "Optimal daily pricing",
      descriptionRo: "Strategie pe sezon, evenimente și cerere — reguli clare, transparență totală.",
      descriptionEn: "Strategy based on season, events and demand — clear rules, total transparency.",
    },
    {
      icon: Sparkles,
      labelRo: "Housekeeping",
      labelEn: "Housekeeping",
      titleRo: "Curățenie standard hotelier",
      titleEn: "Hotel-standard cleaning",
      descriptionRo: "Checklist, consumabile, inspecție foto, timpi controlați, rotație perfectă între șederi.",
      descriptionEn: "Checklist, supplies, photo inspection, controlled timing, perfect rotation between stays.",
    },
    {
      icon: MessageSquare,
      labelRo: "Guest ops",
      labelEn: "Guest ops",
      titleRo: "Comunicare & self check-in",
      titleEn: "Communication & self check-in",
      descriptionRo: "Mesaje automate, ghid digital, suport rapid — experiență premium pentru oaspeți.",
      descriptionEn: "Automated messages, digital guide, quick support — premium guest experience.",
    },
    {
      icon: Wrench,
      labelRo: "Maintenance",
      labelEn: "Maintenance",
      titleRo: "Întreținere proactivă",
      titleEn: "Proactive maintenance",
      descriptionRo: "Intervenții rapide, parteneri verificați, prevenție (nu reparații după pagubă).",
      descriptionEn: "Quick interventions, verified partners, prevention (not repairs after damage).",
    },
    {
      icon: BarChart3,
      labelRo: "Reporting",
      labelEn: "Reporting",
      titleRo: "Rapoarte clare",
      titleEn: "Clear reports",
      descriptionRo: "Performanță pe lună / sezon, grad ocupare, ADR, RevPAR, recomandări de optimizare.",
      descriptionEn: "Monthly/seasonal performance, occupancy rate, ADR, RevPAR, optimization recommendations.",
    },
    {
      icon: ShieldCheck,
      labelRo: "Compliance",
      labelEn: "Compliance",
      titleRo: "Conformitate & liniște",
      titleEn: "Compliance & peace of mind",
      descriptionRo: "Proces standardizat, documente, reguli pentru oaspeți — fără surprize, fără improvizații.",
      descriptionEn: "Standardized process, documents, guest rules — no surprises, no improvisation.",
    },
  ];

  return (
    <section className="py-20 bg-background relative overflow-hidden">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div
          ref={headerRef}
          className={`text-center mb-16 transition-all duration-700 ${
            headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
            {language === 'ro' ? 'Garanții de model' : 'Service Guarantees'}
          </span>
          <h2 className="text-3xl md:text-4xl font-serif font-semibold text-foreground mb-4">
            {language === 'ro' ? 'Garanții de model & transparență' : 'Model Guarantees & Transparency'}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {language === 'ro'
              ? 'De la preț și operațiuni până la rapoarte — rulezi proprietatea ca un hotel, fără timp pierdut.'
              : 'From pricing and operations to reports — run your property like a hotel, without wasting time.'}
          </p>
        </div>

        {/* Guarantees Grid */}
        <div
          ref={gridRef}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto"
        >
          {guarantees.map((guarantee, index) => {
            const Icon = guarantee.icon;
            return (
              <div
                key={index}
                className={`group p-6 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all duration-500 hover:shadow-lg hover:shadow-primary/5 ${
                  gridVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: gridVisible ? `${index * 75}ms` : '0ms' }}
              >
                {/* Icon & Label */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {language === 'ro' ? guarantee.labelRo : guarantee.labelEn}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-lg font-serif font-semibold text-foreground mb-2">
                  {language === 'ro' ? guarantee.titleRo : guarantee.titleEn}
                </h3>

                {/* Description */}
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {language === 'ro' ? guarantee.descriptionRo : guarantee.descriptionEn}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ServiceGuaranteesGrid;
