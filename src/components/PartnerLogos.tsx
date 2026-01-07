import { useLanguage } from "@/i18n/LanguageContext";

const partners = [
  { name: "Airbnb", logo: "https://upload.wikimedia.org/wikipedia/commons/6/69/Airbnb_Logo_B%C3%A9lo.svg" },
  { name: "Booking.com", logo: "https://upload.wikimedia.org/wikipedia/commons/6/66/Booking.com_logo.svg" },
  { name: "Expedia", logo: "https://upload.wikimedia.org/wikipedia/commons/5/5b/Expedia_2012_logo.svg" },
  { name: "Vrbo", logo: "https://upload.wikimedia.org/wikipedia/commons/4/43/Vrbo_Logo.svg" },
  { name: "TripAdvisor", logo: "https://upload.wikimedia.org/wikipedia/commons/0/02/TripAdvisor_Logo.svg" },
];

const PartnerLogos = () => {
  const { t } = useLanguage();

  return (
    <section className="section-padding-sm bg-secondary/30 border-y border-border">
      <div className="container mx-auto px-6">
        {/* Premium Header */}
        <div className="text-center section-header-spacing">
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
          {partners.map((partner) => (
            <div
              key={partner.name}
              className="group relative p-4 md:p-6 rounded-xl transition-all duration-500 hover:bg-background/50 hover:shadow-lg"
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
            </div>
          ))}
        </div>

        {/* Trust indicator */}
        <div className="mt-12 text-center">
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
