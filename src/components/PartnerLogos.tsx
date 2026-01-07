import { useLanguage } from "@/i18n/LanguageContext";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const partners = [
  { name: "Airbnb", logo: "https://upload.wikimedia.org/wikipedia/commons/6/69/Airbnb_Logo_B%C3%A9lo.svg", url: "https://www.airbnb.com/users/show/123456789" },
  { name: "Booking.com", logo: "https://upload.wikimedia.org/wikipedia/commons/6/66/Booking.com_logo.svg", url: "https://www.booking.com/hotel/ro/realtrust.html" },
  { name: "Expedia", logo: "https://upload.wikimedia.org/wikipedia/commons/5/5b/Expedia_2012_logo.svg", url: "https://www.expedia.com" },
  { name: "Vrbo", logo: "https://upload.wikimedia.org/wikipedia/commons/4/43/Vrbo_Logo.svg", url: "https://www.vrbo.com" },
  { name: "TripAdvisor", logo: "https://upload.wikimedia.org/wikipedia/commons/0/02/TripAdvisor_Logo.svg", url: "https://www.tripadvisor.com" },
];

const PartnerLogos = () => {
  const { t } = useLanguage();
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.2 });

  return (
    <section className="section-padding-sm bg-secondary/30 border-y border-border">
      <div className="container mx-auto px-6" ref={ref}>
        {/* Premium Header */}
        <div className={`text-center section-header-spacing transition-all duration-700 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        }`}>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-3">
            {t.partners.label}
          </p>
          <h2 className="heading-premium text-2xl md:text-3xl mb-4">
            {t.partners.trustedTitle}
          </h2>
          <p className="text-premium text-muted-foreground max-w-2xl mx-auto">
            {t.partners.trustedSubtitle}
          </p>
        </div>

        {/* Partner Logos Grid */}
        <div className="flex flex-wrap justify-center items-center gap-10 md:gap-16 lg:gap-20">
          {partners.map((partner, index) => (
            <a
              key={partner.name}
              href={partner.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`group relative p-4 md:p-6 rounded-xl transition-all duration-500 hover:bg-background/50 hover:shadow-lg cursor-pointer ${
                isVisible 
                  ? "opacity-100 translate-y-0 scale-100" 
                  : "opacity-0 translate-y-8 scale-95"
              }`}
              style={{ 
                transitionDelay: isVisible ? `${150 + index * 100}ms` : "0ms"
              }}
              aria-label={`Vezi profilul nostru pe ${partner.name}`}
            >
              <img
                src={partner.logo}
                alt={partner.name}
                className="h-10 md:h-14 lg:h-16 w-auto object-contain grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
                loading="lazy"
                width={140}
                height={56}
              />
              {/* Hover tooltip */}
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 translate-y-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-xs text-muted-foreground whitespace-nowrap">
                {partner.name}
              </span>
            </a>
          ))}
        </div>

        {/* Trust indicator */}
        <div className={`mt-12 text-center transition-all duration-700 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`} style={{ transitionDelay: isVisible ? "700ms" : "0ms" }}>
          <p className="text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              {t.partners.activeText}
            </span>
          </p>
        </div>
      </div>
    </section>
  );
};

export default PartnerLogos;
