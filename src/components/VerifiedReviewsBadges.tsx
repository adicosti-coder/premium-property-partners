import { useLanguage } from "@/i18n/LanguageContext";
import { Star, ShieldCheck } from "lucide-react";

const VerifiedReviewsBadges = () => {
  const { language } = useLanguage();
  const isRo = language === "ro";

  const badges = [
    {
      platform: "Booking.com",
      score: "9.7",
      scoreSuffix: "/10",
      detail: isRo ? "500+ recenzii verificate" : "500+ verified reviews",
      accent: "from-[#003580] to-[#0057b8]",
    },
    {
      platform: "Airbnb",
      score: "4.9",
      scoreSuffix: "★",
      detail: isRo ? "Superhost · oaspeți verificați" : "Superhost · verified guests",
      accent: "from-[#FF385C] to-[#E61E4D]",
    },
    {
      platform: "Google",
      score: "5.0",
      scoreSuffix: "★",
      detail: isRo ? "Recenzii locale Timișoara" : "Local Timișoara reviews",
      accent: "from-[#4285F4] to-[#34A853]",
    },
  ];

  return (
    <section className="relative py-12 md:py-16 bg-gradient-to-b from-background via-muted/20 to-background border-y border-border/40 overflow-hidden">
      {/* Subtle gold accent line top */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />

      <div className="container mx-auto px-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-3">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <p className="text-xs font-bold text-primary uppercase tracking-widest">
              {isRo ? "Recenzii Verificate" : "Verified Reviews"}
            </p>
          </div>
          <h2 className="text-2xl md:text-3xl font-serif font-semibold text-foreground">
            {isRo ? "Încrederea oaspeților, " : "Guest trust, "}
            <span className="text-gradient-gold">
              {isRo ? "confirmată public" : "publicly confirmed"}
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {badges.map((badge) => (
            <div
              key={badge.platform}
              className="group relative bg-card border border-border/60 rounded-2xl p-5 shadow-sm hover:shadow-xl hover:border-primary/40 transition-all duration-300 hover:-translate-y-1"
            >
              {/* Top accent bar */}
              <div className={`absolute top-0 left-4 right-4 h-[3px] rounded-b-full bg-gradient-to-r ${badge.accent}`} />

              <div className="flex items-start justify-between mb-3 pt-2">
                <p className="text-sm font-bold text-foreground tracking-tight">{badge.platform}</p>
                <Star className="w-4 h-4 text-primary fill-primary" />
              </div>

              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-3xl md:text-4xl font-serif font-bold text-foreground leading-none">
                  {badge.score}
                </span>
                <span className="text-lg font-semibold text-primary">{badge.scoreSuffix}</span>
              </div>

              <p className="text-xs text-muted-foreground leading-snug">{badge.detail}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6 italic">
          {isRo
            ? "Scoruri actualizate continuu · 100% recenzii reale, fără filtrare"
            : "Continuously updated scores · 100% real reviews, no filtering"}
        </p>
      </div>
    </section>
  );
};

export default VerifiedReviewsBadges;
