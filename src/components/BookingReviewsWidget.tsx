import { useLanguage } from "@/i18n/LanguageContext";
import { Star } from "lucide-react";

/**
 * Booking.com reviews widget with embedded iframe + LodgingBusiness JSON-LD.
 * Displays both an official Booking badge and a summary card.
 */
const BookingReviewsWidget = () => {
  const { language } = useLanguage();

  const schema = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    "name": "ApArt Hotel Timișoara by RealTrust",
    "image": "https://realtrust.ro/og-image.jpg",
    "url": "https://realtrust.ro",
    "telephone": "+40723154520",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Timișoara",
      "addressRegion": "Timiș",
      "addressCountry": "RO"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "9.7",
      "bestRating": "10",
      "reviewCount": "527",
      "ratingCount": "527"
    },
    "priceRange": "€50 - €150"
  };

  return (
    <section className="py-16 bg-card/50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <div className="container mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-serif font-bold text-center mb-4 text-foreground">
          {language === "ro"
            ? "Ce Spun Oaspeții pe Booking.com"
            : "What Guests Say on Booking.com"}
        </h2>
        <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-10">
          {language === "ro"
            ? "Scor verificat din peste 527 de recenzii reale pe Booking.com"
            : "Verified score from over 527 real reviews on Booking.com"}
        </p>

        <div className="grid md:grid-cols-2 gap-8 items-center max-w-4xl mx-auto">
          {/* Score Card */}
          <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-card border border-border shadow-lg">
            <div className="flex items-center gap-2">
              <svg className="w-6 h-6 text-[#003580] dark:text-[#4a8fe7] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2 7h4v10H2V7zm6-4h4v14H8V3zm6 6h4v8h-4V9zm6-2h4v10h-4V7z" opacity="0.8" />
              </svg>
              <span className="text-sm font-medium text-muted-foreground">Booking.com</span>
            </div>
            <div className="text-6xl font-bold text-primary">9.7</div>
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-primary text-primary" />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              {language === "ro" ? "527+ recenzii verificate" : "527+ verified reviews"}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              {language === "ro" ? "Superb" : "Superb"}
            </span>
          </div>

          {/* Booking iframe embed */}
          <div className="rounded-2xl overflow-hidden border border-border shadow-lg bg-card min-h-[320px]">
            <iframe
              src="https://www.booking.com/reviewlist.html?aid=304142&label=gen173nr-1FCAEoggI46AdIM1gEaCeIAQGYATG4ARfIAQzYAQHoAQH4AQKIAgGoAgO4ArT-6L4GwAIB0gIkZWM2OGY3NjUtNDkwMy00YjM5LTgyMzctZGNhZTc3OTlmMGMz2AIF4AIB&cc1=ro&pagename=apart-hotel-timisoara"
              title={language === "ro" ? "Recenzii Booking.com" : "Booking.com Reviews"}
              className="w-full h-[320px] border-0"
              loading="lazy"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default BookingReviewsWidget;
