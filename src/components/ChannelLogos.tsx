import { useLanguage } from "@/i18n/LanguageContext";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { cn } from "@/lib/utils";

const ChannelLogos = () => {
  const { language } = useLanguage();
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  const content = {
    ro: {
      title: "Prezent pe Toate Platformele Majore",
      subtitle: "Sincronizare automată, zero suprapuneri, expunere maximă",
    },
    en: {
      title: "Present on All Major Platforms",
      subtitle: "Automatic sync, zero overlaps, maximum exposure",
    },
  };

  const t = content[language as keyof typeof content] || content.ro;

  const channels = [
    { name: "Booking.com", color: "#003580", isInternal: false },
    { name: "Airbnb", color: "#FF5A5F", isInternal: false },
    { name: "Expedia", color: "#00355F", isInternal: false },
    { name: "Vrbo", color: "#3D67A6", isInternal: false },
    { name: "Direct", color: "hsl(var(--primary))", isInternal: true },
  ];

  const ChannelSVG = ({ name, color }: { name: string; color: string }) => {
    switch (name) {
      case "Booking.com":
        return (
          <svg viewBox="0 0 300 50" className="max-h-8 md:max-h-10 w-auto" role="img" aria-label="Booking.com">
            <text x="0" y="38" fill={color} style={{ fontSize: '36px', fontWeight: 700, fontFamily: 'Arial, sans-serif' }}>
              Booking.com
            </text>
          </svg>
        );
      case "Airbnb":
        return (
          <svg viewBox="0 0 448 512" className="max-h-8 md:max-h-10 w-auto" style={{ width: 32 }}>
            <path fill={color} d="M224 373.12c-25.24-31.67-40.08-59.43-45-83.18-22.55-88 112.61-88 90.06 0-5.45 24.25-20.29 52-45 83.18zm138.15 73.23c-42.06 18.31-83.67-10.88-119.3-50.47 103.9-130.07 46.11-200-18.85-200-54.92 0-85.16 46.51-73.28 100.5 6.93 29.19 25.23 62.39 54.43 99.5-32.53 36.05-60.55 52.69-85.15 54.92-50 7.43-89.11-41.06-71.3-91.09 15.1-39.16 111.72-231.18 115.87-241.56 15.75-30.07 25.56-57.4 59.38-57.4 32.34 0 43.4 25.94 60.37 59.87 36 70.62 89.35 177.48 114.84 239.09 13.17 33.07-1.37 71.29-37.01 86.64zm47-136.12C280.27 35.93 273.13 32 224 32c-45.52 0-64.87 31.67-84.66 72.79C33.18 317.1-22.28 367.9 8.49 437.76c22.21 50.64 82.78 78.65 134.27 60.09 22.43-8.09 39.01-23.38 60.37-43.47 21.36 20.09 37.93 35.38 60.37 43.47 51.49 18.56 112.06-9.45 134.27-60.09 30.78-69.86-24.69-120.67-107.62-333.12z"/>
          </svg>
        );
      case "Expedia":
        return (
          <svg viewBox="0 0 200 50" className="max-h-8 md:max-h-10 w-auto">
            <text x="0" y="38" fill={color} style={{ fontSize: '32px', fontWeight: 700, fontFamily: 'Arial, sans-serif' }}>
              Expedia
            </text>
          </svg>
        );
      case "Vrbo":
        return (
          <svg viewBox="0 0 120 50" className="max-h-8 md:max-h-10 w-auto">
            <text x="0" y="38" fill={color} style={{ fontSize: '36px', fontWeight: 700, fontFamily: 'Arial, sans-serif' }}>
              Vrbo
            </text>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <section className="py-12 bg-card border-y border-border">
      <div ref={ref} className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h3
            className={cn(
              "text-xl md:text-2xl font-semibold text-foreground mb-2",
              "transition-all duration-500",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
          >
            {t.title}
          </h3>
          <p
            className={cn(
              "text-muted-foreground",
              "transition-all duration-500",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
            style={{ transitionDelay: "100ms" }}
          >
            {t.subtitle}
          </p>
        </div>

        {/* Logos */}
        <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10">
          {channels.map((channel, index) => (
            <div
              key={channel.name}
              className={cn(
                "flex items-center justify-center p-4 rounded-xl bg-muted/50 border border-border",
                "hover:bg-muted hover:border-primary/30 transition-all duration-300",
                "w-32 h-16 md:w-40 md:h-20",
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              )}
              style={{ transitionDelay: `${200 + index * 100}ms` }}
            >
              {channel.isInternal ? (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span className="font-semibold text-foreground">
                    {language === "ro" ? "Site Direct" : "Direct Site"}
                  </span>
                </div>
              ) : (
                <ChannelSVG name={channel.name} color={channel.color} />
              )}
            </div>
          ))}
        </div>

        {/* Sync indicator */}
        <div
          className={cn(
            "flex items-center justify-center gap-2 mt-8 text-sm text-muted-foreground",
            "transition-all duration-500",
            isVisible ? "opacity-100" : "opacity-0"
          )}
          style={{ transitionDelay: "600ms" }}
        >
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span>
            {language === "ro"
              ? "Sincronizare în timp real activă"
              : "Real-time sync active"}
          </span>
        </div>
      </div>
    </section>
  );
};

export default ChannelLogos;
