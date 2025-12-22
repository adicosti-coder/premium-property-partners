import { ClipboardCheck, Settings, BarChart3, Banknote } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: ClipboardCheck,
    title: "Evaluare Gratuită",
    description: "Analizăm proprietatea ta și estimăm potențialul de venit lunar.",
  },
  {
    number: "02",
    icon: Settings,
    title: "Pregătire & Setup",
    description: "Optimizăm spațiul, creăm fotografii profesionale și listăm pe platforme.",
  },
  {
    number: "03",
    icon: BarChart3,
    title: "Gestionare Completă",
    description: "Preluăm rezervările, check-in/out, curățenia și comunicarea cu oaspeții.",
  },
  {
    number: "04",
    icon: Banknote,
    title: "Încasezi Lunar",
    description: "Primești veniturile lunar, însoțite de rapoarte detaliate.",
  },
];

const HowItWorks = () => {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-gold uppercase tracking-widest text-sm font-semibold mb-4 font-sans">Proces Simplu</p>
          <h2 className="text-3xl md:text-4xl font-serif font-semibold text-foreground mb-4">
            Cum Funcționează
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto font-sans">
            Patru pași simpli care te separă de un venit pasiv consistent.
          </p>
        </div>
        
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative group">
                {/* Connector line (hidden on last item) */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-10 left-[60%] w-full h-px bg-gradient-to-r from-border to-transparent" />
                )}
                
                <div className="text-center">
                  {/* Number badge */}
                  <div className="relative inline-flex items-center justify-center mb-6">
                    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary transition-colors duration-300">
                      <step.icon className="w-8 h-8 text-primary group-hover:text-cream transition-colors duration-300" />
                    </div>
                    <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gold text-primary text-sm font-bold flex items-center justify-center font-sans">
                      {step.number}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-serif font-semibold text-foreground mb-2">
                    {step.title}
                  </h3>
                  
                  <p className="text-muted-foreground text-sm leading-relaxed font-sans">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
