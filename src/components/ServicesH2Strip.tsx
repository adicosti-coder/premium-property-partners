import { Link } from "react-router-dom";
import { Building2, TrendingUp, Home, BedDouble } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

/**
 * SEO-focused H2 strip — exposes core services with explicit H2 headings
 * targeting high-priority keywords detected by SEO audit:
 * - "apartamente de vânzare Timișoara"
 * - "investiții imobiliare Timișoara"
 * - "administrare proprietăți Timișoara"
 * - "cazare Timișoara regim hotelier"
 */
export function ServicesH2Strip() {
  const { language } = useLanguage();
  const isRo = language === "ro";

  const services = [
    {
      to: "/imobiliare",
      icon: Building2,
      h2: isRo ? "Agenție imobiliară Timișoara" : "Real estate agency Timișoara",
      desc: isRo
        ? "Servicii imobiliare Timișoara: vânzări, cumpărări, închirieri și consultanță locală cu evaluare profesionistă."
        : "Real estate services in Timișoara: sales, rentals and local consulting with professional valuation.",
    },
    {
      to: "/cartiere",
      icon: Building2,
      h2: isRo ? "Apartamente de vânzare Timișoara" : "Apartments for sale Timișoara",
      desc: isRo
        ? "Proprietăți verificate în cele mai căutate cartiere — prețuri actualizate săptămânal."
        : "Verified properties in the most sought-after neighborhoods — prices updated weekly.",
    },
    {
      to: "/investitii",
      icon: TrendingUp,
      h2: isRo ? "Investiții imobiliare Timișoara" : "Real estate investments Timișoara",
      desc: isRo
        ? "Catalog premium 2026 cu randament estimat 9.4% net și analiză AI per proprietate."
        : "Premium 2026 catalog with estimated 9.4% net yield and AI analysis per property.",
    },
    {
      to: "/pentru-proprietari",
      icon: Home,
      h2: isRo ? "Administrare proprietăți Timișoara" : "Property management Timișoara",
      desc: isRo
        ? "Servicii complete regim hotelier: rezervări, oaspeți, curățenie, raportare lunară."
        : "Full short-term rental management: bookings, guests, cleaning, monthly reports.",
    },
    {
      to: "/cazare",
      icon: BedDouble,
      h2: isRo ? "Cazare Timișoara regim hotelier" : "Short-term stays Timișoara",
      desc: isRo
        ? "Apartamente premium aproape de Centru, Iulius Town, UVT și obiective turistice."
        : "Premium apartments near the Old Town, Iulius Town, UVT and tourist landmarks.",
    },
  ];

  return (
    <section
      aria-label={isRo ? "Servicii principale RealTrust" : "RealTrust core services"}
      className="w-full bg-background py-10 md:py-14 border-b border-border/40"
    >
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-5">
          {services.map(({ to, icon: Icon, h2, desc }) => (
            <Link
              key={to}
              to={to}
              className="group block rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md transition-all"
            >
              <Icon className="h-6 w-6 text-primary mb-3" aria-hidden="true" />
              <h2 className="text-base md:text-lg font-serif font-semibold text-foreground mb-1.5 group-hover:text-primary transition-colors">
                {h2}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ServicesH2Strip;
