import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { ArrowRight } from "lucide-react";

/**
 * Contextual internal links shown after article content.
 * Maps article categories/tags to relevant site pages for crawl depth + topical authority.
 */

interface InternalLink {
  label: string;
  labelEn: string;
  href: string;
  matchCategories: string[];
  matchTags: string[];
}

const SITE_LINKS: InternalLink[] = [
  {
    label: "Vezi toate proprietățile disponibile",
    labelEn: "View all available properties",
    href: "/oaspeti",
    matchCategories: ["Cazare", "Turism", "Guest Experience"],
    matchTags: ["cazare", "timișoara", "apartament", "booking"],
  },
  {
    label: "Calculează randamentul investiției tale",
    labelEn: "Calculate your investment yield",
    href: "/investitii",
    matchCategories: ["Investiții", "Management", "Financiar"],
    matchTags: ["roi", "randament", "investiție", "profit", "yield"],
  },
  {
    label: "Servicii pentru proprietari",
    labelEn: "Services for owners",
    href: "/proprietari",
    matchCategories: ["Management", "Administrare", "Proprietari"],
    matchTags: ["proprietar", "administrare", "management", "regim hotelier"],
  },
  {
    label: "Ghidul zonelor din Timișoara",
    labelEn: "Timișoara area guide",
    href: "/oaspeti#city-guide",
    matchCategories: ["Turism", "Ghid"],
    matchTags: ["timișoara", "zone", "cartier", "locație"],
  },
  {
    label: "Servicii imobiliare complete",
    labelEn: "Complete real estate services",
    href: "/imobiliare",
    matchCategories: ["Imobiliare"],
    matchTags: ["vânzare", "cumpărare", "imobiliare", "apartament"],
  },
];

interface InternalLinksProps {
  category: string;
  tags: string[];
}

const InternalLinks = ({ category, tags }: InternalLinksProps) => {
  const { language } = useLanguage();
  const lowerTags = tags.map((t) => t.toLowerCase());

  const relevantLinks = SITE_LINKS.filter((link) => {
    const catMatch = link.matchCategories.some(
      (c) => c.toLowerCase() === category.toLowerCase()
    );
    const tagMatch = link.matchTags.some((t) => lowerTags.includes(t.toLowerCase()));
    return catMatch || tagMatch;
  }).slice(0, 3);

  if (relevantLinks.length === 0) return null;

  return (
    <nav
      aria-label={language === "ro" ? "Linkuri utile" : "Useful links"}
      className="my-8 p-5 rounded-xl border border-border bg-muted/30"
    >
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        {language === "ro" ? "Citește și" : "Read also"}
      </h3>
      <ul className="space-y-2">
        {relevantLinks.map((link) => (
          <li key={link.href}>
            <Link
              to={link.href}
              className="inline-flex items-center gap-2 text-primary hover:underline text-sm font-medium"
            >
              <ArrowRight className="w-3 h-3" />
              {language === "en" ? link.labelEn : link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default InternalLinks;
