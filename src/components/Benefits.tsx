import { TrendingUp, Shield, Clock } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const benefits = [
  {
    icon: TrendingUp,
    title: "Venituri Maximizate",
    description: "Strategii dinamice de preț și optimizare continuă pentru a obține cele mai bune randamente pe piață.",
  },
  {
    icon: Shield,
    title: "Fără Griji",
    description: "Gestionăm complet proprietatea ta — de la check-in până la mentenanță și comunicare cu oaspeții.",
  },
  {
    icon: Clock,
    title: "Transparență Totală",
    description: "Rapoarte detaliate în timp real. Știi mereu exact cum performează investiția ta.",
  },
];

const Benefits = () => {
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: gridRef, isVisible: gridVisible } = useScrollAnimation({ threshold: 0.1 });

  return (
    <section className="py-24 bg-gradient-subtle">
      <div className="container mx-auto px-6">
        <div 
          ref={headerRef}
          className={`text-center mb-16 transition-all duration-700 ${
            headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h2 className="text-3xl md:text-4xl font-serif font-semibold text-foreground mb-4">
            De Ce Proprietarii Aleg <span className="text-gradient-gold">RealTrust</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto font-sans">
            Oferim soluții complete pentru proprietari care doresc să obțină maximum din investiția lor, fără complicații.
          </p>
        </div>
        
        <div ref={gridRef} className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {benefits.map((benefit, index) => (
            <div 
              key={index}
              className={`group relative bg-card p-8 rounded-2xl shadow-card hover:shadow-elegant transition-all duration-500 border border-border hover:border-gold/30 ${
                gridVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: gridVisible ? `${index * 100}ms` : '0ms' }}
            >
              {/* Icon container */}
              <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center mb-6 group-hover:bg-gold transition-colors duration-300">
                <benefit.icon className="w-7 h-7 text-cream" />
              </div>
              
              <h3 className="text-xl font-serif font-semibold text-foreground mb-3">
                {benefit.title}
              </h3>
              
              <p className="text-muted-foreground leading-relaxed font-sans">
                {benefit.description}
              </p>
              
              {/* Subtle hover accent */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-gold/0 via-gold to-gold/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-b-2xl" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Benefits;
