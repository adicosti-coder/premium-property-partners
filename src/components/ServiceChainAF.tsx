import { 
  Camera, 
  Globe, 
  Users, 
  Sparkles, 
  Wrench, 
  BarChart3,
  ArrowRight,
  CheckCircle2
} from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { cn } from "@/lib/utils";

const ServiceChainAF = () => {
  const { language } = useLanguage();
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  const content = {
    ro: {
      badge: "Lanțul Complet A-F",
      title: "De la Setup la Raportare",
      titleHighlight: "Tu Nu Faci Nimic",
      subtitle: "Acoperim integral toate etapele administrării. Fiecare pas este gestionat profesional.",
      steps: [
        {
          letter: "A",
          icon: Camera,
          title: "Setup & Fotografiere",
          description: "Audit proprietate, fotografii profesionale, optimizare dotări",
          details: ["Sesiune foto HD", "Staging recomandat", "Inventar complet"],
        },
        {
          letter: "B",
          icon: Globe,
          title: "Listare & Distribuție",
          description: "Prezență pe toate platformele majore, sincronizare automată",
          details: ["Booking, Airbnb, Expedia", "Descrieri SEO", "Pricing dinamic"],
        },
        {
          letter: "C",
          icon: Users,
          title: "Rezervări & Oaspeți",
          description: "Gestionare rezervări, comunicare, verificare oaspeți",
          details: ["Răspuns < 1 oră", "Verificare identitate", "Check-in automat"],
        },
        {
          letter: "D",
          icon: Sparkles,
          title: "Curățenie & Lenjerie",
          description: "Echipă profesională, protocol hotelier, QC după fiecare sejur",
          details: ["50+ puncte checklist", "Lenjerie premium", "Reumplere consumabile"],
        },
        {
          letter: "E",
          icon: Wrench,
          title: "Mentenanță & Suport",
          description: "Intervenții preventive și reactive, suport 24/7",
          details: ["Echipă tehnică dedicată", "Urgențe 24/7", "Raport intervenții"],
        },
        {
          letter: "F",
          icon: BarChart3,
          title: "Raportare & Plăți",
          description: "Dashboard în timp real, transfer lunar, transparență totală",
          details: ["Raport detaliat lunar", "Plată în 5 zile", "Acces portal owner"],
        },
      ],
    },
    en: {
      badge: "Complete A-F Chain",
      title: "From Setup to Reporting",
      titleHighlight: "You Do Nothing",
      subtitle: "We fully cover all stages of management. Each step is professionally handled.",
      steps: [
        {
          letter: "A",
          icon: Camera,
          title: "Setup & Photography",
          description: "Property audit, professional photos, equipment optimization",
          details: ["HD photo session", "Recommended staging", "Complete inventory"],
        },
        {
          letter: "B",
          icon: Globe,
          title: "Listing & Distribution",
          description: "Presence on all major platforms, automatic sync",
          details: ["Booking, Airbnb, Expedia", "SEO descriptions", "Dynamic pricing"],
        },
        {
          letter: "C",
          icon: Users,
          title: "Bookings & Guests",
          description: "Booking management, communication, guest verification",
          details: ["Response < 1 hour", "Identity verification", "Auto check-in"],
        },
        {
          letter: "D",
          icon: Sparkles,
          title: "Cleaning & Linens",
          description: "Professional team, hotel protocol, QC after each stay",
          details: ["50+ point checklist", "Premium linens", "Consumables refill"],
        },
        {
          letter: "E",
          icon: Wrench,
          title: "Maintenance & Support",
          description: "Preventive and reactive interventions, 24/7 support",
          details: ["Dedicated tech team", "24/7 emergencies", "Intervention reports"],
        },
        {
          letter: "F",
          icon: BarChart3,
          title: "Reporting & Payments",
          description: "Real-time dashboard, monthly transfer, full transparency",
          details: ["Detailed monthly report", "Payment in 5 days", "Owner portal access"],
        },
      ],
    },
  };

  const t = content[language as keyof typeof content] || content.ro;

  return (
    <section className="py-20 bg-gradient-to-b from-background to-muted/30 overflow-hidden">
      <div ref={ref} className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-14">
          <div
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4",
              "transition-all duration-500",
              isVisible ? "opacity-100 scale-100" : "opacity-0 scale-90"
            )}
          >
            <BarChart3 className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">{t.badge}</span>
          </div>
          <h2
            className={cn(
              "text-3xl md:text-4xl font-serif font-bold text-foreground mb-3",
              "transition-all duration-500",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
            style={{ transitionDelay: "100ms" }}
          >
            {t.title} — <span className="text-gradient-gold">{t.titleHighlight}</span>
          </h2>
          <p
            className={cn(
              "text-lg text-muted-foreground max-w-2xl mx-auto",
              "transition-all duration-500",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            )}
            style={{ transitionDelay: "200ms" }}
          >
            {t.subtitle}
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {t.steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.letter}
                className={cn(
                  "group relative p-6 rounded-2xl bg-card border border-border",
                  "hover:border-primary/30 hover:shadow-lg transition-all duration-300",
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                )}
                style={{ transitionDelay: `${300 + index * 100}ms` }}
              >
                {/* Letter Badge */}
                <div className="absolute -top-3 -left-3 w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center shadow-lg">
                  {step.letter}
                </div>

                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-6 h-6 text-primary" />
                </div>

                {/* Content */}
                <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">{step.description}</p>

                {/* Details */}
                <ul className="space-y-1.5">
                  {step.details.map((detail, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-3.5 h-3.5 text-gold flex-shrink-0" />
                      {detail}
                    </li>
                  ))}
                </ul>

                {/* Connector arrow (except last in row) */}
                {(index % 3 !== 2 || index === t.steps.length - 1) && index !== t.steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                    <ArrowRight className="w-6 h-6 text-primary/40" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ServiceChainAF;
