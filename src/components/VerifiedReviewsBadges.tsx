import { useLanguage } from "@/i18n/LanguageContext";
import { Star } from "lucide-react";

const VerifiedReviewsBadges = () => {
  const { language } = useLanguage();
  const isRo = language === "ro";

  const badges = [
    {
      platform: "Booking.com",
      score: "9.7 / 10",
      detail: isRo ? "500+ recenzii" : "500+ reviews",
      color: "bg-[hsl(220,80%,45%)]",
      textColor: "text-white",
    },
    {
      platform: "Airbnb",
      score: "4.9 ★",
      detail: isRo ? "oaspeți verificați" : "verified guests",
      color: "bg-[hsl(350,65%,52%)]",
      textColor: "text-white",
    },
    {
      platform: "Google",
      score: "★★★★★",
      detail: "realtrust.ro",
      color: "bg-card",
      textColor: "text-foreground",
      border: true,
    },
  ];

  return (
    <section className="py-8 bg-muted/30 border-y border-border/50">
      <div className="container mx-auto px-6">
        <p className="text-center text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6">
          {isRo ? "Recenzii Verificate" : "Verified Reviews"}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {badges.map((badge) => (
            <div
              key={badge.platform}
              className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-sm ${badge.color} ${badge.textColor} ${badge.border ? "border border-border" : ""} min-w-[200px]`}
            >
              <div>
                <p className="text-xs font-semibold">{badge.platform}</p>
                <p className="text-lg font-bold leading-tight">{badge.score}</p>
                <p className="text-xs">{badge.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default VerifiedReviewsBadges;
