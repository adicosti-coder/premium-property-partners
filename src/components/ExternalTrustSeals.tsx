import { useLanguage } from "@/i18n/LanguageContext";
import { ShieldCheck, ExternalLink } from "lucide-react";

/**
 * External trust seal badges – Booking.com + Trusted.ro
 * Provides third-party visual verification for brand authority.
 */
const ExternalTrustSeals = () => {
  const { language } = useLanguage();

  const seals = [
    {
      name: "Booking.com",
      score: "9.7 / 10",
      subtitle: language === "ro" ? "Scor Verificat" : "Verified Score",
      url: "https://www.booking.com/hotel/ro/apart-hotel-timisoara.html",
      logo: null, // Booking.com external SVG was returning 404; use icon fallback instead
      bg: "bg-[#003580]/10 dark:bg-[#003580]/20",
      border: "border-[#003580]/30",
      icon: "booking",
      accent: "text-[#003580] dark:text-[#4a8fe7]",
    },
    {
      name: "Trusted.ro",
      score: language === "ro" ? "Verificat" : "Verified",
      subtitle: language === "ro" ? "Magazin de Încredere" : "Trusted Business",
      url: "https://www.trusted.ro",
      logo: null, // use icon
      bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
      border: "border-emerald-500/30",
      accent: "text-emerald-600 dark:text-emerald-400",
    },
  ];

  return (
    <section className="py-10">
      <div className="container mx-auto px-6">
        <div className="flex flex-wrap justify-center gap-4 md:gap-6">
          {seals.map((seal) => (
            <a
              key={seal.name}
              href={seal.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`group flex items-center gap-3 px-5 py-3 rounded-xl border ${seal.bg} ${seal.border} transition-all hover:scale-105 hover:shadow-md`}
            >
              {seal.logo ? (
                <img
                  src={seal.logo}
                  alt={seal.name}
                  width={28}
                  height={28}
                  loading="lazy"
                  className="shrink-0"
                />
              ) : (
                <ShieldCheck className={`w-7 h-7 shrink-0 ${seal.accent}`} />
              )}
              <div className="flex flex-col">
                <span className={`text-sm font-bold ${seal.accent}`}>
                  {seal.score}
                </span>
                <span className="text-xs text-muted-foreground">
                  {seal.name} · {seal.subtitle}
                </span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ExternalTrustSeals;
