import { Link } from "react-router-dom";
import { 
  Building2, 
  Key, 
  Home, 
  FileText, 
  ArrowRight,
  Sparkles 
} from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const ServicesOverview = () => {
  const { language } = useLanguage();
  const { ref: sectionRef, isVisible } = useScrollAnimation({ threshold: 0.1 });
  const { ref: gridRef, isVisible: gridVisible } = useScrollAnimation({ threshold: 0.1 });

  const content = {
    ro: {
      badge: "Ce Oferim",
      title: "Un Ecosistem Complet",
      titleHighlight: "de Servicii",
      subtitle: "De la administrarea proprietății tale până la experiența perfectă pentru oaspeți",
      services: [
        {
          icon: Building2,
          title: "Administrare Proprietăți",
          description: "Management complet în regim hotelier pentru proprietari",
          link: "#calculator",
          cta: "Calculează Venitul",
          color: "from-amber-500/20 to-amber-600/10",
        },
        {
          icon: Key,
          title: "Cazare Premium",
          description: "Apartamente echipate complet pentru oaspeți exigenți",
          link: "/oaspeti",
          cta: "Vezi Apartamente",
          color: "from-blue-500/20 to-blue-600/10",
        },
        {
          icon: Home,
          title: "Servicii Imobiliare",
          description: "Consultanță și intermediere pentru tranzacții imobiliare",
          link: "/imobiliare",
          cta: "Află Mai Multe",
          color: "from-green-500/20 to-green-600/10",
        },
        {
          icon: FileText,
          title: "Blog & Ghiduri",
          description: "Articole și sfaturi pentru proprietari și oaspeți",
          link: "/blog",
          cta: "Citește Articole",
          color: "from-purple-500/20 to-purple-600/10",
        },
      ],
    },
    en: {
      badge: "What We Offer",
      title: "A Complete Ecosystem",
      titleHighlight: "of Services",
      subtitle: "From managing your property to creating the perfect guest experience",
      services: [
        {
          icon: Building2,
          title: "Property Management",
          description: "Complete short-term rental management for owners",
          link: "#calculator",
          cta: "Calculate Income",
          color: "from-amber-500/20 to-amber-600/10",
        },
        {
          icon: Key,
          title: "Premium Stays",
          description: "Fully equipped apartments for discerning guests",
          link: "/oaspeti",
          cta: "View Apartments",
          color: "from-blue-500/20 to-blue-600/10",
        },
        {
          icon: Home,
          title: "Real Estate Services",
          description: "Consulting and brokerage for real estate transactions",
          link: "/imobiliare",
          cta: "Learn More",
          color: "from-green-500/20 to-green-600/10",
        },
        {
          icon: FileText,
          title: "Blog & Guides",
          description: "Articles and tips for owners and guests",
          link: "/blog",
          cta: "Read Articles",
          color: "from-purple-500/20 to-purple-600/10",
        },
      ],
    },
  };

  const t = content[language as keyof typeof content] || content.ro;

  const handleClick = (link: string) => {
    if (link.startsWith("#")) {
      const element = document.getElementById(link.slice(1));
      element?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section
      ref={sectionRef}
      className="py-16 md:py-20 bg-secondary/30 relative overflow-hidden"
    >
      {/* Background decoration - hidden on mobile to prevent edge shadows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl hidden md:block" />

      <div className="container mx-auto px-6 relative z-10">
        <div
          className={`text-center mb-12 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-primary text-sm font-semibold">{t.badge}</span>
          </div>

          {/* Title */}
          <h2 className="text-3xl md:text-4xl font-serif font-semibold text-foreground mb-4">
            {t.title} <span className="text-gradient-gold">{t.titleHighlight}</span>
          </h2>

          {/* Subtitle */}
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            {t.subtitle}
          </p>
        </div>

        {/* Services Grid */}
        <div
          ref={gridRef}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto"
        >
          {t.services.map((service, index) => {
            const Icon = service.icon;
            const isExternalLink = !service.link.startsWith("#");
            
            const CardContent = (
              <div
                className={`group relative h-full bg-card rounded-2xl border border-border hover:border-primary/30 transition-all duration-500 hover:shadow-elegant overflow-hidden ${
                  gridVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
                style={{ transitionDelay: gridVisible ? `${index * 100}ms` : "0ms" }}
              >
                {/* Gradient background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${service.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                
                <div className="relative p-6 flex flex-col h-full">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-7 h-7 text-primary" />
                  </div>
                  
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {service.title}
                  </h3>
                  
                  <p className="text-sm text-muted-foreground mb-4 flex-grow">
                    {service.description}
                  </p>
                  
                  <div className="flex items-center text-primary font-medium text-sm group-hover:gap-2 transition-all">
                    <span>{service.cta}</span>
                    <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            );

            return isExternalLink ? (
              <Link key={index} to={service.link} className="block h-full">
                {CardContent}
              </Link>
            ) : (
              <button
                key={index}
                onClick={() => handleClick(service.link)}
                className="block h-full text-left w-full"
              >
                {CardContent}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ServicesOverview;
