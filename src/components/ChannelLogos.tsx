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
    {
      name: "Booking.com",
      logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Booking.com_logo.svg/512px-Booking.com_logo.svg.png",
      color: "bg-[#003580]",
    },
    {
      name: "Airbnb",
      logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Airbnb_Logo_B%C3%A9lo.svg/512px-Airbnb_Logo_B%C3%A9lo.svg.png",
      color: "bg-[#FF5A5F]",
    },
    {
      name: "Expedia",
      logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Expedia_2012_logo.svg/512px-Expedia_2012_logo.svg.png",
      color: "bg-[#00355F]",
    },
    {
      name: "Vrbo",
      logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Vrbo_Logo.svg/512px-Vrbo_Logo.svg.png",
      color: "bg-[#3D67A6]",
    },
    {
      name: "Direct",
      logo: null,
      isInternal: true,
      color: "bg-primary",
    },
  ];

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
                  <div className={cn("w-3 h-3 rounded-full", channel.color)} />
                  <span className="font-semibold text-foreground">
                    {language === "ro" ? "Site Direct" : "Direct Site"}
                  </span>
                </div>
              ) : (
                <img
                  src={channel.logo!}
                  alt={channel.name}
                  className="max-h-8 md:max-h-10 w-auto object-contain filter dark:brightness-0 dark:invert"
                />
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
