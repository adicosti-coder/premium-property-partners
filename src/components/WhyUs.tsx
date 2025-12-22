import { CheckCircle2 } from "lucide-react";

const reasons = [
  "Experiență dovedită în administrarea a peste 150 de proprietăți premium",
  "Echipă dedicată disponibilă 24/7 pentru oaspeți și urgențe",
  "Parteneriate cu cele mai mari platforme: Airbnb, Booking, Expedia",
  "Fotografii profesionale și descrieri optimizate pentru conversie",
  "Prețuri dinamice bazate pe cerere și sezonalitate",
  "Rapoarte financiare transparente și accesibile în timp real",
];

const WhyUs = () => {
  return (
    <section className="py-24 bg-hero relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
          {/* Content */}
          <div>
            <p className="text-gold uppercase tracking-widest text-sm font-semibold mb-4 font-sans">Avantajul RealTrust</p>
            <h2 className="text-3xl md:text-4xl font-serif font-semibold text-cream mb-6">
              De Ce Suntem Alegerea Potrivită
            </h2>
            <p className="text-cream/70 mb-10 leading-relaxed font-sans">
              Nu suntem doar o agenție de închirieri. Suntem parteneri în investiția ta, dedicați să îți maximizăm veniturile și să eliminăm orice bătaie de cap.
            </p>
            
            <ul className="space-y-4">
              {reasons.map((reason, index) => (
                <li 
                  key={index} 
                  className="flex items-start gap-3 text-cream/80 font-sans"
                >
                  <CheckCircle2 className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Stats card */}
          <div className="relative">
            <div className="bg-cream/5 backdrop-blur-sm rounded-3xl p-10 border border-cream/10">
              <div className="text-center mb-8">
                <p className="text-cream/60 text-sm uppercase tracking-widest mb-2 font-sans">Performanță Medie</p>
                <p className="text-5xl md:text-6xl font-serif font-semibold text-gradient-gold">+40%</p>
                <p className="text-cream/70 mt-2 font-sans">Venit suplimentar față de închirierea clasică</p>
              </div>
              
              <div className="grid grid-cols-2 gap-6 pt-8 border-t border-cream/10">
                <div className="text-center">
                  <p className="text-2xl font-serif font-semibold text-cream">72h</p>
                  <p className="text-cream/50 text-sm font-sans">Timp mediu de listare</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-serif font-semibold text-cream">15%</p>
                  <p className="text-cream/50 text-sm font-sans">Comision transparent</p>
                </div>
              </div>
            </div>
            
            {/* Floating accent */}
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-gold/20 rounded-full blur-2xl" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyUs;
