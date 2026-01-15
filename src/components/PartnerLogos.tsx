import { useLanguage } from "@/i18n/LanguageContext";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

// SVG logos as components for reliability
const AirbnbLogo = () => (
  <svg viewBox="0 0 448 512" className="w-full h-full fill-current">
    <path d="M224 373.12c-25.24-31.67-40.08-59.43-45-83.18-22.55-88 112.61-88 90.06 0-5.45 24.25-20.29 52-45 83.18zm138.15 73.23c-42.06 18.31-83.67-10.88-119.3-50.47 103.9-130.07 46.11-200-18.85-200-54.92 0-85.16 46.51-73.28 100.5 6.93 29.19 25.23 62.39 54.43 99.5-32.53 36.05-60.55 52.69-85.15 54.92-50 7.43-89.11-41.06-71.3-91.09 15.1-39.16 111.72-231.18 115.87-241.56 15.75-30.07 25.56-57.4 59.38-57.4 32.34 0 43.4 25.94 60.37 59.87 36 70.62 89.35 177.48 114.84 239.09 13.17 33.07-1.37 71.29-37.01 86.64zm47-136.12C280.27 35.93 273.13 32 224 32c-45.52 0-64.87 31.67-84.66 72.79C33.18 317.1-22.28 367.9 8.49 437.76c22.21 50.64 82.78 78.65 134.27 60.09 22.43-8.09 39.01-23.38 60.37-43.47 21.36 20.09 37.93 35.38 60.37 43.47 51.49 18.56 112.06-9.45 134.27-60.09 30.78-69.86-24.69-120.67-107.62-333.12z"/>
  </svg>
);

const BookingLogo = () => (
  <svg viewBox="0 0 300 50" className="w-full h-full">
    <text x="0" y="38" className="fill-current" style={{ fontSize: '36px', fontWeight: 700, fontFamily: 'Arial, sans-serif' }}>
      Booking.com
    </text>
  </svg>
);

const ExpediaLogo = () => (
  <svg viewBox="0 0 200 50" className="w-full h-full">
    <text x="0" y="38" className="fill-current" style={{ fontSize: '32px', fontWeight: 700, fontFamily: 'Arial, sans-serif' }}>
      Expedia
    </text>
  </svg>
);

const VrboLogo = () => (
  <svg viewBox="0 0 120 50" className="w-full h-full">
    <text x="0" y="38" className="fill-current" style={{ fontSize: '36px', fontWeight: 700, fontFamily: 'Arial, sans-serif' }}>
      Vrbo
    </text>
  </svg>
);

const TripAdvisorLogo = () => (
  <svg viewBox="0 0 250 50" className="w-full h-full">
    <text x="0" y="38" className="fill-current" style={{ fontSize: '30px', fontWeight: 700, fontFamily: 'Arial, sans-serif' }}>
      TripAdvisor
    </text>
  </svg>
);

const partners = [
  { name: "Airbnb", Logo: AirbnbLogo, url: "https://www.airbnb.com/users/show/123456789", color: "#FF5A5F" },
  { name: "Booking.com", Logo: BookingLogo, url: "https://www.booking.com/hotel/ro/realtrust.html", color: "#003580" },
  { name: "Expedia", Logo: ExpediaLogo, url: "https://www.expedia.com", color: "#00355F" },
  { name: "Vrbo", Logo: VrboLogo, url: "https://www.vrbo.com", color: "#3B5998" },
  { name: "TripAdvisor", Logo: TripAdvisorLogo, url: "https://www.tripadvisor.com", color: "#00AF87" },
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
              className={`group relative p-4 md:p-6 rounded-xl transition-all duration-500 hover:bg-background/50 cursor-pointer ${
                isVisible 
                  ? "opacity-100 translate-y-0 scale-100" 
                  : "opacity-0 translate-y-8 scale-95"
              }`}
              style={{ 
                transitionDelay: isVisible ? `${150 + index * 100}ms` : "0ms"
              }}
              aria-label={`Vezi profilul nostru pe ${partner.name}`}
            >
              {/* Glow effect background */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500" />
              
              {/* Shine effect overlay */}
              <div className="absolute inset-0 rounded-xl overflow-hidden">
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
              </div>
              
              <div 
                className="relative z-10 h-10 md:h-14 lg:h-16 w-24 md:w-32 lg:w-40 text-muted-foreground opacity-50 group-hover:opacity-100 transition-all duration-500"
                style={{ color: partner.color }}
              >
                <partner.Logo />
              </div>
              
              {/* Hover tooltip */}
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 translate-y-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-xs text-muted-foreground whitespace-nowrap z-20">
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
