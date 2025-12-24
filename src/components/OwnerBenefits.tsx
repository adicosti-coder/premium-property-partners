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

const benefits = [
  {
    icon: Camera,
    title: "Fotografii Profesionale",
    description: "Sesiune foto gratuită cu echipament profesional pentru a scoate proprietatea ta în evidență.",
  },
  {
    icon: TrendingUp,
    title: "Prețuri Dinamice",
    description: "Algoritm de pricing care ajustează tarifele în timp real pentru venituri maxime.",
  },
  {
    icon: Shield,
    title: "Verificarea Oaspeților",
    description: "Fiecare oaspete este verificat înainte de check-in pentru siguranța proprietății.",
  },
  {
    icon: Clock,
    title: "Suport 24/7",
    description: "Echipă dedicată disponibilă non-stop pentru oaspeți și situații urgente.",
  },
  {
    icon: BarChart3,
    title: "Rapoarte Detaliate",
    description: "Acces la dashboard cu statistici în timp real: venituri, ocupare, cheltuieli.",
  },
  {
    icon: Headphones,
    title: "Comunicare cu Oaspeții",
    description: "Gestionăm toată comunicarea, de la rezervare până la checkout.",
  },
  {
    icon: Sparkles,
    title: "Curățenie Profesională",
    description: "Echipe de curățenie verificate după fiecare sejur, cu standarde hoteliere.",
  },
  {
    icon: CalendarCheck,
    title: "Gestionare Calendar",
    description: "Sincronizare pe toate platformele pentru a evita suprapunerile de rezervări.",
  },
];

const OwnerBenefits = () => {
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: gridRef, isVisible: gridVisible } = useScrollAnimation({ threshold: 0.05 });
  const { ref: ctaRef, isVisible: ctaVisible } = useScrollAnimation();

  return (
    <section className="py-24 bg-hero relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-full h-full" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }} />
      </div>
      
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-6 relative z-10">
        <div 
          ref={headerRef}
          className={`text-center mb-16 transition-all duration-700 ${
            headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <p className="text-primary uppercase tracking-widest text-sm font-semibold mb-4">
            Ce Primești
          </p>
          <h2 className="text-3xl md:text-4xl font-serif font-semibold text-foreground mb-4">
            Tot Ce Ai Nevoie, <span className="text-gradient-gold">Într-un Singur Loc</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Când listezi cu RealTrust, beneficiezi de servicii complete care transformă proprietatea ta într-o investiție profitabilă.
          </p>
        </div>

        <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className={`group bg-card/50 backdrop-blur-sm rounded-2xl p-6 border border-border hover:border-primary/30 transition-all duration-500 hover:shadow-elegant ${
                gridVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: gridVisible ? `${index * 75}ms` : '0ms' }}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <benefit.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {benefit.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div 
          ref={ctaRef}
          className={`mt-16 text-center transition-all duration-700 ${
            ctaVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary/10 border border-primary/20">
            <span className="text-foreground font-medium">Comision transparent de doar</span>
            <span className="text-2xl font-serif font-bold text-primary">15%</span>
            <span className="text-foreground font-medium">din venituri</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OwnerBenefits;
