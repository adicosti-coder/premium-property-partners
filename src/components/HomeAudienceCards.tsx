import { Link } from "react-router-dom";
import { ArrowRight, Home, Building2 } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

/** Two compact routing cards directly under the homepage hero. Static, no data fetching. */
const HomeAudienceCards = () => {
  const { language } = useLanguage();
  const ro = language !== "en";
  const cards = [
    { to: "/servicii-imobiliare", Icon: Home, title: ro ? "Vânzări / Cumpărări / Închirieri" : "Sales / Purchases / Rentals", text: ro ? "Intermediere imobiliară în Timișoara, cu contract scris." : "Real estate brokerage in Timișoara, under written contract." },
    { to: "/pentru-proprietari", Icon: Building2, title: ro ? "Administrare Regim Hotelier" : "Short-Term Rental Management", text: ro ? "Administrăm apartamentul tău, 15–20% din venitul net." : "We manage your apartment for 15–20% of net income." },
  ];
  return (
    <nav aria-label={ro ? "Alege serviciul" : "Choose a service"} className="bg-background">
      <ul className="container mx-auto grid grid-cols-1 gap-3 px-4 pt-4 sm:grid-cols-2 sm:gap-4 md:pt-6">
        {cards.map(({ to, Icon, title, text }) => (
          <li key={to}>
            <Link to={to} className="group flex min-h-12 items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Icon className="h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
              <span className="flex-1">
                <span className="block font-semibold text-foreground">{title}</span>
                <span className="block text-sm text-muted-foreground">{text}</span>
              </span>
              <ArrowRight className="h-5 w-5 shrink-0 text-primary transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default HomeAudienceCards;
