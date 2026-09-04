import { Link } from "react-router-dom";
import { TrendingUp, Calculator, ArrowRight } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

/**
 * SEO-focused dual CTA section targeting high-intent keywords:
 * - "investiții imobiliare ansambluri rezidențiale Timișoara"
 * - "calculează ROI apartament regim hotelier"
 * - "randament închiriere apartament Timișoara"
 *
 * Placed after ServicesH2Strip to capture users scanning for specific
 * investment or ROI actions after the general service overview.
 */
export function SEODualCTASection() {
  const { language } = useLanguage();
  const isRo = language === "ro";

  const blocks = [
    {
      to: "/ansambluri-rezidentiale",
      icon: TrendingUp,
      h2: isRo
        ? "Investiții Imobiliare în Ansambluri Rezidențiale Timișoara"
        : "Real Estate Investments in Residential Complexes Timișoara",
      desc: isRo
        ? "Analizăm constant randamentul activelor din cele mai importante complexe din Timișoara, precum ISHO, Paltim, Cetate sau City of Mara, pentru a-ți oferi oportunități cu ROI ridicat."
        : "We constantly analyze asset yields in Timișoara's top residential complexes — ISHO, Paltim, Cetate, City of Mara — to bring you high-ROI opportunities.",
      cta: isRo
        ? "Vezi Catalogul complet de Ansambluri Rezidențiale în Timișoara"
        : "Browse the full Residential Complexes Catalog in Timișoara",
    },
    {
      to: "/analiza-roi-apartament",
      icon: Calculator,
      h2: isRo
        ? "Calculează ROI-ul Apartamentului Tău în Regim Hotelier"
        : "Calculate Your Apartment's ROI in Short-Term Rental",
      desc: isRo
        ? "Rulează o simulare avansată pentru a vedea dacă proprietatea ta generează un randament mai bun pe termen scurt (ApArt Hotel) comparativ cu o închiriere tradițională."
        : "Run an advanced simulation to see if your property generates better short-term yields (ApArt Hotel) compared to traditional long-term rental.",
      cta: isRo
        ? "Rulează o Analiză ROI Apartament"
        : "Run an Apartment ROI Analysis",
    },
  ];

  return (
    <section
      aria-label={isRo ? "Investiții și calcul ROI" : "Investments and ROI calculator"}
      className="w-full bg-muted/30 py-14 md:py-20 border-b border-border/40"
    >
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {blocks.map(({ to, icon: Icon, h2, desc, cta }) => (
            <article
              key={to}
              className="group relative flex flex-col rounded-2xl border border-border bg-card p-6 md:p-8 hover:border-primary/40 hover:shadow-lg transition-all duration-300"
            >
              {/* Accent stripe */}
              <div className="absolute left-0 top-6 bottom-6 w-1 rounded-full bg-gradient-to-b from-primary to-accent opacity-60 group-hover:opacity-100 transition-opacity" />

              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h2 className="text-xl md:text-2xl font-serif font-semibold text-foreground leading-tight group-hover:text-primary transition-colors">
                  {h2}
                </h2>
              </div>

              <p className="text-base text-muted-foreground leading-relaxed mb-6 flex-grow pl-16">
                {desc}
              </p>

              <Link
                to={to}
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors pl-16"
              >
                {cta}
                <ArrowRight
                  className="h-4 w-4 group-hover:translate-x-1 transition-transform"
                  aria-hidden="true"
                />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default SEODualCTASection;
