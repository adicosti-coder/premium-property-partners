import { useLanguage } from "@/i18n/LanguageContext";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { 
  FileCheck, 
  Calendar, 
  ShieldCheck,
  CheckCircle2
} from "lucide-react";

const TrustBadges = () => {
  const { language } = useLanguage();
  const animation = useScrollAnimation({ threshold: 0.1 });

  const badges = language === 'ro' ? [
    {
      icon: FileCheck,
      title: "Contract Flexibil",
      subtitle: "Fără perioadă minimă",
      description: "Începi când vrei, fără angajamente pe termen lung",
      color: "from-emerald-500 to-green-600"
    },
    {
      icon: Calendar,
      title: "Reziliere în 30 Zile",
      subtitle: "Libertate totală",
      description: "Rămâi cu noi pentru că ești mulțumit, nu obligat",
      color: "from-blue-500 to-indigo-600"
    },
    {
      icon: ShieldCheck,
      title: "Verificare Oaspeți",
      subtitle: "Securitate maximă",
      description: "Fiecare oaspete este verificat și înregistrat legal",
      color: "from-amber-500 to-orange-600"
    }
  ] : [
    {
      icon: FileCheck,
      title: "Flexible Contract",
      subtitle: "No minimum period",
      description: "Start when you want, no long-term commitments",
      color: "from-emerald-500 to-green-600"
    },
    {
      icon: Calendar,
      title: "30-Day Termination",
      subtitle: "Total freedom",
      description: "Stay with us because you're satisfied, not obligated",
      color: "from-blue-500 to-indigo-600"
    },
    {
      icon: ShieldCheck,
      title: "Guest Verification",
      subtitle: "Maximum security",
      description: "Every guest is verified and legally registered",
      color: "from-amber-500 to-orange-600"
    }
  ];

  return (
    <section className="py-12 bg-gradient-to-r from-muted/50 via-background to-muted/50 border-y border-border/50">
      <div 
        ref={animation.ref}
        className={`container mx-auto px-4 transition-all duration-700 ${
          animation.isVisible 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {badges.map((badge, index) => (
            <div 
              key={index}
              className="group relative bg-card border border-border/50 rounded-2xl p-6 hover:border-primary/30 hover:shadow-lg transition-all duration-300"
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              {/* Gradient accent line */}
              <div className={`absolute top-0 left-6 right-6 h-1 bg-gradient-to-r ${badge.color} rounded-b-full opacity-80`} />
              
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${badge.color} flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <badge.icon className="w-7 h-7 text-white" />
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-lg">{badge.title}</h3>
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                  </div>
                  <p className="text-primary font-semibold text-sm mb-2">
                    {badge.subtitle}
                  </p>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {badge.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom message */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          {language === 'ro' 
            ? '✨ Transparență și încredere — valorile noastre fundamentale' 
            : '✨ Transparency and trust — our core values'}
        </p>
      </div>
    </section>
  );
};

export default TrustBadges;
