import { Key, Clock, Sparkles, ShieldCheck, Wifi, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Key,
    title: "Auto Check-in 24/7",
    description: "Acces independent oricând cu cod numeric securizat. Fără așteptare, fără coordonare.",
  },
  {
    icon: Clock,
    title: "Suport Non-Stop",
    description: "Echipa noastră este disponibilă 24/7 pentru orice nevoie sau întrebare.",
  },
  {
    icon: Sparkles,
    title: "Curățenie Profesională",
    description: "Standarde hoteliere de curățenie și igienă pentru fiecare sejur.",
  },
  {
    icon: ShieldCheck,
    title: "Siguranță Garantată",
    description: "Apartamente verificate, echipamente de siguranță și zone securizate.",
  },
  {
    icon: Wifi,
    title: "WiFi de Mare Viteză",
    description: "Internet rapid inclus în toate proprietățile pentru muncă sau relaxare.",
  },
  {
    icon: MapPin,
    title: "Locații Premium",
    description: "Toate apartamentele sunt situate în zonele centrale ale Timișoarei.",
  },
];

const GuestSection = () => {
  return (
    <section id="oaspeti" className="py-24 bg-card relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23fbbf24' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Key className="w-4 h-4 text-primary" />
            <span className="text-primary text-sm font-semibold">Pentru Oaspeți</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-serif font-semibold text-foreground mb-4">
            Experiență de <span className="text-gradient-gold">Cazare Premium</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Apartamentele noastre oferă confortul unui hotel cu intimitatea unei case. Check-in automat, curățenie impecabilă și suport 24/7.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto mb-12">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-6 rounded-xl bg-secondary/30 hover:bg-secondary/50 border border-border hover:border-primary/20 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-serif font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Button variant="premium" size="xl" onClick={() => {
            const portfolioSection = document.getElementById('portofoliu');
            portfolioSection?.scrollIntoView({ behavior: 'smooth' });
          }}>
            Vezi Apartamentele Disponibile
          </Button>
        </div>
      </div>
    </section>
  );
};

export default GuestSection;
