const partners = [
  { name: "Airbnb", logo: "https://upload.wikimedia.org/wikipedia/commons/6/69/Airbnb_Logo_B%C3%A9lo.svg" },
  { name: "Booking.com", logo: "https://upload.wikimedia.org/wikipedia/commons/6/66/Booking.com_logo.svg" },
  { name: "Expedia", logo: "https://upload.wikimedia.org/wikipedia/commons/5/5b/Expedia_2012_logo.svg" },
  { name: "Vrbo", logo: "https://upload.wikimedia.org/wikipedia/commons/4/43/Vrbo_Logo.svg" },
  { name: "TripAdvisor", logo: "https://upload.wikimedia.org/wikipedia/commons/0/02/TripAdvisor_Logo.svg" },
];

const PartnerLogos = () => {
  return (
    <section className="py-12 bg-secondary/30 border-y border-border">
      <div className="container mx-auto px-6">
        <p className="text-center text-muted-foreground text-sm uppercase tracking-widest mb-8">
          Proprietățile noastre sunt listate pe
        </p>
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
          {partners.map((partner) => (
            <div
              key={partner.name}
              className="grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
            >
              <img
                src={partner.logo}
                alt={partner.name}
                className="h-8 md:h-10 w-auto object-contain"
                loading="lazy"
                width={100}
                height={32}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PartnerLogos;
