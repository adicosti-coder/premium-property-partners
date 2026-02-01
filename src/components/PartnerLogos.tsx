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

const EuplatescLogo = () => (
  <svg viewBox="0 0 200 50" className="w-full h-full">
    <text x="0" y="38" className="fill-current" style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'Arial, sans-serif' }}>
      EuPlătesc
    </text>
  </svg>
);

const PynbookingLogo = () => (
  <svg viewBox="0 0 200 50" className="w-full h-full">
    <text x="0" y="38" className="fill-current" style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'Arial, sans-serif' }}>
      Pynbooking
    </text>
  </svg>
);

const WhatsAppLogo = () => (
  <svg viewBox="0 0 448 512" className="w-full h-full fill-current">
    <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
  </svg>
);

const ImobiliareRoLogo = () => (
  <svg viewBox="0 0 200 50" className="w-full h-full">
    <text x="0" y="38" className="fill-current" style={{ fontSize: '26px', fontWeight: 700, fontFamily: 'Arial, sans-serif' }}>
      Imobiliare.ro
    </text>
  </svg>
);

const partners = [
  { name: "Airbnb", Logo: AirbnbLogo, url: "https://www.airbnb.com/users/show/123456789", color: "#FF5A5F" },
  { name: "Booking.com", Logo: BookingLogo, url: "https://www.booking.com/hotel/ro/realtrust.html", color: "#003580" },
  { name: "Expedia", Logo: ExpediaLogo, url: "https://www.expedia.com", color: "#00355F" },
  { name: "Vrbo", Logo: VrboLogo, url: "https://www.vrbo.com", color: "#3B5998" },
  { name: "TripAdvisor", Logo: TripAdvisorLogo, url: "https://www.tripadvisor.com", color: "#00AF87" },
  { name: "EuPlătesc", Logo: EuplatescLogo, url: "https://www.euplatesc.ro", color: "#E31837" },
  { name: "Pynbooking", Logo: PynbookingLogo, url: "https://www.pynbooking.com", color: "#6366F1" },
  { name: "WhatsApp", Logo: WhatsAppLogo, url: "https://wa.me/40723154520", color: "#25D366" },
  { name: "Imobiliare.ro", Logo: ImobiliareRoLogo, url: "https://www.imobiliare.ro", color: "#E31837" },
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
