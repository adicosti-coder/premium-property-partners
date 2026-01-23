import { useLanguage } from "@/i18n/LanguageContext";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { 
  Rocket, 
  Building2, 
  Award, 
  Users, 
  Home, 
  Globe, 
  Sparkles,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const CompanyTimeline = () => {
  const { language } = useLanguage();
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  const content = {
    ro: {
      badge: "25+ Ani de Excelență",
      title: "Evoluția Noastră",
      subtitle: "O călătorie de peste un sfert de secol în imobiliare",
      milestones: [
        {
          year: "1999",
          icon: Rocket,
          title: "Începuturile",
          description: "Punerea fundamentelor unei agenții imobiliare în Timișoara, cu viziunea de a aduce standarde internaționale în piața locală.",
          highlight: "Prima tranzacție încheiată"
        },
        {
          year: "2004",
          icon: Building2,
          title: "Expansiune",
          description: "Extinderea portofoliului către proprietăți comerciale și dezvoltarea relațiilor cu investitori instituționali.",
          highlight: "100+ tranzacții finalizate"
        },
        {
          year: "2006",
          icon: Award,
          title: "Recunoaștere",
          description: "Consolidarea poziției de acoperire regională, cu o echipă de experți dedicați și procese standardizate.",
          highlight: "Echipă de 10+ profesioniști"
        },
        {
          year: "2010",
          icon: Award,
          title: "Diversificare",
          description: "Lansarea serviciilor de property management și administrare de imobile pentru proprietari absenți.",
          highlight: "Servicii complete de administrare"
        },
        {
          year: "2015",
          icon: Users,
          title: "Continuare Diversificare",
          description: "Lansarea serviciilor de property management și administrare de imobile în regim hotelier pentru proprietari absenți.",
          highlight: "Servicii complete de administrare imobile în regim hotelier"
        },
        {
          year: "2017",
          icon: Home,
          title: "Nașterea ApArt Hotel",
          description: "Identificarea oportunității în piața de închirieri pe termen scurt și lansarea brandului ApArt Hotel.",
          highlight: "Primele proprietăți în regim hotelier"
        },
        {
          year: "2021",
          icon: Globe,
          title: "Digitalizare",
          description: "Implementarea tehnologiilor smart home, check-in digital și integrarea cu platformele internaționale.",
          highlight: "Automatizare 100% a proceselor"
        },
        {
          year: "2023",
          icon: Sparkles,
          title: "Integrare Totală",
          description: "Unificarea brandurilor RealTrust și ApArt Hotel sub aceeași viziune și consolidarea sinergiilor.",
          highlight: "Portofoliu extins"
        },
        {
          year: "2026+",
          icon: TrendingUp,
          title: "Viitorul",
          description: "Expansiune regională, inovații tehnologice și consolidarea poziției de lider în management imobiliar premium.",
          highlight: "Obiectiv: 100+ proprietăți"
        }
      ]
    },
    en: {
      badge: "25+ Years of Excellence",
      title: "Our Evolution",
      subtitle: "A journey of over a quarter century in real estate",
      milestones: [
        {
          year: "1999",
          icon: Rocket,
          title: "The Beginning",
          description: "Laying the foundations of a real estate agency in Timișoara, with the vision of bringing international standards to the local market.",
          highlight: "First transaction completed"
        },
        {
          year: "2004",
          icon: Building2,
          title: "Expansion",
          description: "Expanding the portfolio to commercial properties and developing relationships with institutional investors.",
          highlight: "100+ transactions completed"
        },
        {
          year: "2006",
          icon: Award,
          title: "Recognition",
          description: "Consolidating regional coverage position, with a team of dedicated experts and standardized processes.",
          highlight: "Team of 10+ professionals"
        },
        {
          year: "2010",
          icon: Award,
          title: "Diversification",
          description: "Launching property management and building administration services for absentee owners.",
          highlight: "Complete management services"
        },
        {
          year: "2015",
          icon: Users,
          title: "Continued Diversification",
          description: "Launching property management and hotel-regime building administration services for absentee owners.",
          highlight: "Complete hotel-regime property management services"
        },
        {
          year: "2017",
          icon: Home,
          title: "Birth of ApArt Hotel",
          description: "Identifying the opportunity in the short-term rental market and launching the ApArt Hotel brand.",
          highlight: "First properties in hotel regime"
        },
        {
          year: "2021",
          icon: Globe,
          title: "Digitalization",
          description: "Implementation of smart home technologies, digital check-in, and integration with international platforms.",
          highlight: "100% process automation"
        },
        {
          year: "2023",
          icon: Sparkles,
          title: "Total Integration",
          description: "Unification of RealTrust and ApArt Hotel brands under the same vision and consolidation of synergies.",
          highlight: "Extended portfolio"
        },
        {
          year: "2026+",
          icon: TrendingUp,
          title: "The Future",
          description: "Regional expansion, technological innovations, and consolidation of the position as leader in premium property management.",
          highlight: "Goal: 100+ properties"
        }
      ]
    }
  };

  const t = content[language];

  return (
    <section 
      ref={ref}
      className="py-20 md:py-28 bg-gradient-to-b from-background via-muted/30 to-background relative overflow-hidden"
    >
      {/* Decorative elements */}
      <div className="absolute top-20 left-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div 
          className={cn(
            "text-center mb-16 transition-all duration-700",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          )}
        >
          <Badge variant="outline" className="mb-6 px-4 py-2 text-sm font-medium border-primary/30 bg-primary/5">
            <Award className="w-4 h-4 mr-2 text-primary" />
            {t.badge}
          </Badge>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            {t.title}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            {t.subtitle}
          </p>
        </div>

        {/* Timeline */}
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-amber-500 md:transform md:-translate-x-1/2" />

            {/* Milestones */}
            {t.milestones.map((milestone, index) => {
              const Icon = milestone.icon;
              const isEven = index % 2 === 0;

              return (
                <div
                  key={index}
                  className={cn(
                    "relative flex items-start mb-12 last:mb-0 transition-all duration-700",
                    isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                  )}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  {/* Mobile layout */}
                  <div className="md:hidden flex gap-4 pl-12">
                    {/* Icon on line */}
                    <div className="absolute left-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center shadow-lg shadow-primary/30 z-10">
                      <Icon className="w-4 h-4 text-primary-foreground" />
                    </div>
                    
                    {/* Content */}
                    <div className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 hover:shadow-lg transition-all duration-300 flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl font-bold text-primary">{milestone.year}</span>
                        <span className="text-lg font-semibold text-foreground">{milestone.title}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                        {milestone.description}
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        {milestone.highlight}
                      </Badge>
                    </div>
                  </div>

                  {/* Desktop layout - alternating sides */}
                  <div className="hidden md:flex w-full items-center">
                    {/* Left side content */}
                    <div className={cn(
                      "w-1/2 pr-8",
                      isEven ? "text-right" : "opacity-0"
                    )}>
                      {isEven && (
                        <div className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 hover:shadow-lg transition-all duration-300 inline-block text-left">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-2xl font-bold text-primary">{milestone.year}</span>
                            <span className="text-lg font-semibold text-foreground">{milestone.title}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                            {milestone.description}
                          </p>
                          <Badge variant="secondary" className="text-xs">
                            {milestone.highlight}
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Center icon */}
                    <div className="absolute left-1/2 transform -translate-x-1/2 w-12 h-12 rounded-full bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center shadow-lg shadow-primary/30 z-10 hover:scale-110 transition-transform duration-300">
                      <Icon className="w-6 h-6 text-primary-foreground" />
                    </div>

                    {/* Right side content */}
                    <div className={cn(
                      "w-1/2 pl-8",
                      !isEven ? "text-left" : "opacity-0"
                    )}>
                      {!isEven && (
                        <div className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 hover:shadow-lg transition-all duration-300 inline-block">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-2xl font-bold text-primary">{milestone.year}</span>
                            <span className="text-lg font-semibold text-foreground">{milestone.title}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                            {milestone.description}
                          </p>
                          <Badge variant="secondary" className="text-xs">
                            {milestone.highlight}
                          </Badge>
                        </div>
                      )}
                    </div>
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

export default CompanyTimeline;
