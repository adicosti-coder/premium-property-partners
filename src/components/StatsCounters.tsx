import { useCountAnimation } from "@/hooks/useCountAnimation";
import { useLanguage } from "@/i18n/LanguageContext";
import { Users, Calendar, TrendingUp, Star } from "lucide-react";

const translations = {
  ro: {
    label: "Rezultate Demonstrate",
    title: "Cifrele Care",
    titleHighlight: "Vorbesc de la Sine",
    stats: [
      { value: 10000, suffix: "+", label: "Oaspeți Fericiți", icon: Users },
      { value: 5, suffix: "+", label: "Ani de Experiență", icon: Calendar },
      { value: 85, suffix: "%", label: "Rată Ocupare/An", icon: TrendingUp },
      { value: 4.9, suffix: "★", label: "Rating Mediu", icon: Star, decimals: 1 },
    ],
  },
  en: {
    label: "Proven Results",
    title: "Numbers That",
    titleHighlight: "Speak for Themselves",
    stats: [
      { value: 10000, suffix: "+", label: "Happy Guests", icon: Users },
      { value: 25, suffix: "+", label: "Years Experience", icon: Calendar },
      { value: 85, suffix: "%", label: "Occupancy Rate/Year", icon: TrendingUp },
      { value: 4.9, suffix: "★", label: "Average Rating", icon: Star, decimals: 1 },
    ],
  },
};

interface StatCardProps {
  value: number;
  suffix: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  decimals?: number;
  delay?: number;
}

const StatCard = ({ value, suffix, label, icon: Icon, decimals = 0, delay = 0 }: StatCardProps) => {
  const { count, elementRef } = useCountAnimation({
    end: value,
    duration: 2500,
    delay,
    decimals,
  });

  return (
    <div
      ref={elementRef}
      className="group relative bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 md:p-8 text-center transition-all duration-500 hover:border-primary/50 hover:shadow-[0_0_40px_hsl(var(--primary)/0.15)]"
    >
      {/* Glow effect on hover */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Icon */}
      <div className="relative mb-4 flex justify-center">
        <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors duration-300">
          <Icon className="w-6 h-6 md:w-7 md:h-7" />
        </div>
      </div>

      {/* Counter */}
      <div className="relative mb-2">
        <span className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-foreground">
          {decimals > 0 ? count.toFixed(decimals) : count.toLocaleString()}
        </span>
        <span className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-primary ml-1">
          {suffix}
        </span>
      </div>

      {/* Label */}
      <p className="relative text-sm md:text-base text-muted-foreground font-medium">
        {label}
      </p>

      {/* Animated bottom border */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent group-hover:w-2/3 transition-all duration-500" />
    </div>
  );
};

const StatsCounters = () => {
  const { language } = useLanguage();
  const t = translations[language as keyof typeof translations] || translations.en;

  return (
    <section className="relative py-16 md:py-24 overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/30 to-background" />
      <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2" />
      <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-primary/3 rounded-full blur-3xl -translate-y-1/2" />

      <div className="container mx-auto px-6 relative">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <span className="inline-block px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4 animate-fade-in">
            {t.label}
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-foreground animate-fade-in">
            {t.title}{" "}
            <span className="text-primary">{t.titleHighlight}</span>
          </h2>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
          {t.stats.map((stat, index) => (
            <StatCard
              key={stat.label}
              value={stat.value}
              suffix={stat.suffix}
              label={stat.label}
              icon={stat.icon}
              decimals={stat.decimals}
              delay={index * 150}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsCounters;
