import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";

/**
 * Factual intro paragraph placed directly under the homepage H1.
 * 60-80 words, natural language (no keyword stuffing), with contextual
 * internal links to the canonical pillar pages.
 */
const HomeIntro = () => {
  const { language } = useLanguage();
  const isEn = language === "en";

  return (
    <section
      className="container mx-auto px-6 pt-8"
      aria-label={isEn ? "About RealTrust" : "Despre RealTrust"}
    >
      <p className="max-w-3xl text-base md:text-lg leading-relaxed text-foreground/85">
        {isEn ? (
          <>
            RealTrust is a real estate company based in Timișoara, operating across the city
            and its metropolitan area. We broker{" "}
            <Link to="/servicii-imobiliare" className="underline decoration-primary/40 hover:text-primary">
              sales and rentals
            </Link>
            , advise on{" "}
            <Link to="/investitii" className="underline decoration-primary/40 hover:text-primary">
              property investments
            </Link>{" "}
            and handle{" "}
            <Link to="/pentru-proprietari" className="underline decoration-primary/40 hover:text-primary">
              short-stay management
            </Link>{" "}
            under the ApArt Hotel brand. We work with owners, investors and buyers, and we
            document every yield estimate with the occupancy and cost assumptions behind it.
          </>
        ) : (
          <>
            RealTrust este o companie imobiliară din Timișoara, activă în oraș și în zona
            metropolitană. Intermediem{" "}
            <Link to="/servicii-imobiliare" className="underline decoration-primary/40 hover:text-primary">
              vânzări și închirieri
            </Link>
            , consiliem{" "}
            <Link to="/investitii" className="underline decoration-primary/40 hover:text-primary">
              investiții imobiliare
            </Link>{" "}
            și ne ocupăm de{" "}
            <Link to="/pentru-proprietari" className="underline decoration-primary/40 hover:text-primary">
              administrarea în regim hotelier
            </Link>{" "}
            sub brandul ApArt Hotel. Lucrăm cu proprietari, investitori și cumpărători, iar
            fiecare estimare de randament vine însoțită de ipotezele de ocupare și de costuri
            folosite în calcul.
          </>
        )}
      </p>
    </section>
  );
};

export default HomeIntro;
