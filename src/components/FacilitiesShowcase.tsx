import { useLanguage } from "@/i18n/LanguageContext";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Badge } from "@/components/ui/badge";
import { 
  Coffee, 
  SparkleIcon, 
  Wifi, 
  Tv, 
  KeyRound, 
  Wind, 
  ParkingCircle, 
  ShowerHead,
  UtensilsCrossed,
  Bed,
  Refrigerator,
  WashingMachine
} from "lucide-react";

const FacilitiesShowcase = () => {
  const { language } = useLanguage();
  const animation = useScrollAnimation({ threshold: 0.1 });

  const content = {
    ro: {
      badge: "Facilități Premium",
      title: "Tot ce ai nevoie pentru un",
      titleHighlight: "sejur perfect",
      subtitle: "Apartamentele noastre sunt dotate cu cele mai moderne facilități pentru confortul tău",
    },
    en: {
      badge: "Premium Amenities",
      title: "Everything you need for a",
      titleHighlight: "perfect stay",
      subtitle: "Our apartments are equipped with the most modern amenities for your comfort",
    }
  };

  const facilities = [
    {
      icon: Coffee,
      labelRo: "Nespresso",
      labelEn: "Nespresso",
      color: "bg-amber-500/10 text-amber-600 border-amber-200",
    },
    {
      icon: SparkleIcon,
      labelRo: "Curățenie Hotelieră",
      labelEn: "Hotel Cleaning",
      color: "bg-sky-500/10 text-sky-600 border-sky-200",
    },
    {
      icon: Wifi,
      labelRo: "WiFi Rapid 1Gbps",
      labelEn: "Fast WiFi 1Gbps",
      color: "bg-blue-500/10 text-blue-600 border-blue-200",
    },
    {
      icon: Tv,
      labelRo: "Smart TV Netflix",
      labelEn: "Smart TV Netflix",
      color: "bg-red-500/10 text-red-600 border-red-200",
    },
    {
      icon: KeyRound,
      labelRo: "Self Check-in 24/7",
      labelEn: "Self Check-in 24/7",
      color: "bg-primary/10 text-primary border-primary/20",
    },
    {
      icon: Wind,
      labelRo: "Aer Condiționat",
      labelEn: "Air Conditioning",
      color: "bg-cyan-500/10 text-cyan-600 border-cyan-200",
    },
    {
      icon: ParkingCircle,
      labelRo: "Parcare Gratuită",
      labelEn: "Free Parking",
      color: "bg-green-500/10 text-green-600 border-green-200",
    },
    {
      icon: ShowerHead,
      labelRo: "Articole Baie Premium",
      labelEn: "Premium Toiletries",
      color: "bg-purple-500/10 text-purple-600 border-purple-200",
    },
    {
      icon: UtensilsCrossed,
      labelRo: "Bucătărie Complet Echipată",
      labelEn: "Fully Equipped Kitchen",
      color: "bg-orange-500/10 text-orange-600 border-orange-200",
    },
    {
      icon: Bed,
      labelRo: "Lenjerie Premium",
      labelEn: "Premium Bedding",
      color: "bg-indigo-500/10 text-indigo-600 border-indigo-200",
    },
    {
      icon: Refrigerator,
      labelRo: "Frigider & Congelator",
      labelEn: "Fridge & Freezer",
      color: "bg-slate-500/10 text-slate-600 border-slate-200",
    },
    {
      icon: WashingMachine,
      labelRo: "Mașină de Spălat",
      labelEn: "Washing Machine",
      color: "bg-teal-500/10 text-teal-600 border-teal-200",
    },
  ];

  const t = content[language];

  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-background to-muted/30 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 -right-20 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 -left-20 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div
        ref={animation.ref}
        className={`container mx-auto px-4 relative z-10 transition-all duration-700 ${
          animation.isVisible
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-8'
        }`}
      >
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge variant="outline" className="mb-6 px-4 py-2 text-sm font-medium border-primary/30 bg-primary/5">
            <SparkleIcon className="w-4 h-4 mr-2 text-primary" />
            {t.badge}
          </Badge>
          
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold mb-4">
            {t.title}{" "}
            <span className="text-primary">{t.titleHighlight}</span>
          </h2>
          
          <p className="text-lg text-muted-foreground">
            {t.subtitle}
          </p>
        </div>

        {/* Facilities Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {facilities.map((facility, index) => {
            const Icon = facility.icon;
            return (
              <div
                key={index}
                className={`group flex flex-col items-center gap-3 p-4 rounded-xl border bg-card/50 backdrop-blur-sm hover:bg-card hover:shadow-lg transition-all duration-300 cursor-default ${
                  animation.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={{ transitionDelay: `${index * 50}ms` }}
              >
                <div className={`p-3 rounded-full ${facility.color} group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-sm font-medium text-center text-foreground/80 group-hover:text-foreground transition-colors">
                  {language === 'ro' ? facility.labelRo : facility.labelEn}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FacilitiesShowcase;
