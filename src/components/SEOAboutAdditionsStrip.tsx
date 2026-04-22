import { Link } from "react-router-dom";
import { Scale, Gavel, Building2, Briefcase } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

/**
 * SEO H3 strip for /despre-noi — fills keyword gaps detected by the SEO audit
 * (22.04.2026, /despre-noi):
 *   - "evaluator ANEVAR Timișoara"
 *   - "consultanță juridică imobiliară Timișoara"
 *   - "management imobiliar Timișoara"
 *   - geo: "City Business Centre", "Bega Business Park"
 *
 * Rendered as H3 sub-headings under a single H2 to deepen semantic hierarchy.
 */
export function SEOAboutAdditionsStrip() {
  const { language } = useLanguage();
  const isRo = language === "ro";

  const items = [
    {
      to: "/evaluare-gratuita",
      icon: Scale,
      h3: isRo ? "Evaluator ANEVAR Timișoara" : "ANEVAR appraiser Timișoara",
      desc: isRo
        ? "Colaborăm cu evaluatori ANEVAR autorizați din Timișoara pentru rapoarte oficiale de evaluare — esențiale pentru creditare ipotecară, partaj sau stabilirea unui preț corect de vânzare."
        : "We work with certified ANEVAR appraisers in Timișoara for official valuation reports — essential for mortgage financing, asset division or setting a fair sale price.",
    },
    {
      to: "/contact",
      icon: Gavel,
      h3: isRo
        ? "Consultanță juridică imobiliară Timișoara"
        : "Real estate legal consulting Timișoara",
      desc: isRo
        ? "Pachetul nostru de servicii include, prin parteneri notari și avocați specializați, consultanță juridică imobiliară Timișoara: verificare acte, extras CF, antecontract și siguranța tranzacției."
        : "Through our notary and specialized lawyer partners, our service package includes legal consulting: title checks, land registry extracts, pre-contract drafting and transaction safety.",
    },
    {
      to: "/pentru-proprietari",
      icon: Building2,
      h3: isRo ? "Management imobiliar Timișoara" : "Property management Timișoara",
      desc: isRo
        ? "Servicii complete de management imobiliar Timișoara — administrare apartamente, colectare chirii, mentenanță proactivă și raportare financiară transparentă pentru proprietari rezidenți și non-rezidenți."
        : "Full-stack property management in Timișoara — apartment administration, rent collection, proactive maintenance and transparent financial reporting for resident and non-resident owners.",
    },
    {
      to: "/imobiliare",
      icon: Briefcase,
      h3: isRo
        ? "Cazare corporate City Business Centre & Bega Business Park"
        : "Corporate stays near City Business Centre & Bega Business Park",
      desc: isRo
        ? "Apartamente premium pentru călători business lângă marile hub-uri de birouri din Timișoara: City Business Centre, Bega Business Park, Vox Park și Iulius Town — facturare pe firmă, check-in flexibil și sejururi extinse."
        : "Premium apartments for business travelers near Timișoara's major office hubs: City Business Centre, Bega Business Park, Vox Park and Iulius Town — company invoicing, flexible check-in and extended stays.",
    },
  ];

  return (
    <section
      id="servicii-extinse"
      aria-label={
        isRo
          ? "Servicii extinse: evaluare ANEVAR, consultanță juridică, management imobiliar"
          : "Extended services: ANEVAR appraisal, legal consulting, property management"
      }
      className="w-full bg-muted/30 py-16 md:py-20 border-y border-border/40"
    >
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            {isRo
              ? "Servicii extinse pentru proprietari și investitori"
              : "Extended services for owners and investors"}
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            {isRo
              ? "Pe lângă vânzări, închirieri și regim hotelier, acoperim întregul ciclu al unei tranzacții imobiliare în Timișoara — de la evaluare oficială ANEVAR și consultanță juridică, până la management imobiliar pe termen lung și cazare corporate lângă principalele hub-uri de business."
              : "Beyond sales, rentals and short-term management, we cover the full life cycle of a real estate transaction in Timișoara — from official ANEVAR valuation and legal consulting to long-term property management and corporate stays near the city's main business hubs."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 max-w-5xl mx-auto">
          {items.map(({ to, icon: Icon, h3, desc }) => (
            <Link
              key={to + h3}
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

export default SEOAboutAdditionsStrip;
