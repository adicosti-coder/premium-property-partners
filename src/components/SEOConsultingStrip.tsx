import { Link } from "react-router-dom";
import { Briefcase, Calculator, LineChart } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

/**
 * SEO H3 strip — fills keyword gaps detected by the SEO audit (22.04.2026):
 *   - "consultanță imobiliară Timișoara"
 *   - "evaluare apartament Timișoara"
 *   - "randament închiriere Timișoara"
 *
 * Renders as H3 sub-headings under the existing H2 service strip
 * to deepen the semantic hierarchy (audit recommendation).
 */
export function SEOConsultingStrip() {
  const { language } = useLanguage();
  const isRo = language === "ro";

  const items = [
    {
      to: "/contact",
      icon: Briefcase,
      h3: isRo ? "Consultanță imobiliară Timișoara" : "Real estate consulting Timișoara",
      desc: isRo
        ? "Consultanți seniori cu peste 25 ani experiență locală — strategie de cumpărare, vânzare și investiție pentru piața din Timișoara."
        : "Senior consultants with 25+ years of local experience — buy, sell and investment strategy for Timișoara's market.",
    },
    {
      to: "/evaluare-gratuita",
      icon: Calculator,
      h3: isRo ? "Evaluare apartament Timișoara" : "Apartment valuation Timișoara",
      desc: isRo
        ? "Evaluare gratuită apartament Timișoara cu raport detaliat în 24h: preț de piață, comparabile recente și recomandări pentru valorificare."
        : "Free apartment valuation in Timișoara with a detailed 24h report: market price, recent comparables and listing recommendations.",
    },
    {
      to: "/calculator-roi",
      icon: LineChart,
      h3: isRo ? "Randament închiriere Timișoara" : "Rental yield Timișoara",
      desc: isRo
        ? "Compară randamentul închirierii pe termen lung vs. regim hotelier în Timișoara — calcule actualizate pe zone și tip de proprietate."
        : "Compare long-term rental yield vs. short-term rental in Timișoara — figures updated by zone and property type.",
    },
  ];

  return (
    <section
      aria-label={isRo ? "Servicii de consultanță și evaluare" : "Consulting and valuation services"}
      className="w-full bg-muted/20 py-8 md:py-12 border-b border-border/40"
    >
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
          {items.map(({ to, icon: Icon, h3, desc }) => (
            <Link
              key={to}
              to={to}
              className="group block rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md transition-all"
            >
              <Icon className="h-5 w-5 text-primary mb-3" aria-hidden="true" />
              <h3 className="text-base md:text-lg font-serif font-semibold text-foreground mb-1.5 group-hover:text-primary transition-colors">
                {h3}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default SEOConsultingStrip;
