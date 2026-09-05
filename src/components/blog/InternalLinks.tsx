import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { ArrowRight, BookOpen } from "lucide-react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";

/**
 * Contextual internal links shown after article content.
 * Maps article categories/tags to relevant site pages AND related blog articles.
 */

interface InternalLink {
  label: string;
  labelEn: string;
  href: string;
  matchCategories: string[];
  matchTags: string[];
}

/**
 * Ordered by cluster priority: servicii → investiții → pagini locale →
 * proprietăți → conținut conex. Anchor text is descriptive and varied on
 * purpose (no exact-match keyword repetition across the blog).
 */
const SITE_LINKS: InternalLink[] = [
  {
    label: "administrarea apartamentului în regim hotelier",
    labelEn: "short-stay apartment management",
    href: "/pentru-proprietari",
    matchCategories: ["Management", "Administrare", "Proprietari", "Sfaturi proprietari"],
    matchTags: ["proprietar", "administrare", "management", "regim hotelier", "booking", "airbnb"],
  },
  {
    label: "comisioanele și pachetele de administrare",
    labelEn: "management fees and packages",
    href: "/preturi",
    matchCategories: ["Management", "Financiar", "Taxe & Legislație"],
    matchTags: ["comision", "costuri", "preț", "taxe", "impozit"],
  },
  {
    label: "cum evaluăm o investiție imobiliară în Timișoara",
    labelEn: "how we assess a real estate investment in Timișoara",
    href: "/investitii",
    matchCategories: ["Investiții", "Management", "Financiar", "Investiții imobiliare"],
    matchTags: ["roi", "randament", "investiție", "profit", "yield"],
  },
  {
    label: "analiza de randament pentru apartamentul tău",
    labelEn: "yield analysis for your apartment",
    href: "/calculator-roi",
    matchCategories: ["Investiții", "Financiar"],
    matchTags: ["roi", "calcul", "randament", "yield", "venit"],
  },
  {
    label: "prețurile și randamentele pe cartiere",
    labelEn: "prices and yields by neighbourhood",
    href: "/cartiere",
    matchCategories: ["Turism", "Ghid", "Imobiliare", "Investiții"],
    matchTags: ["timișoara", "zone", "cartier", "locație", "preț mediu"],
  },
  {
    label: "ansamblurile rezidențiale monitorizate de echipa noastră",
    labelEn: "residential complexes we monitor",
    href: "/ansambluri-rezidentiale",
    matchCategories: ["Imobiliare", "Investiții"],
    matchTags: ["ansamblu", "complex", "isho", "bloc nou", "dezvoltator"],
  },
  {
    label: "vânzări, închirieri și consultanță imobiliară",
    labelEn: "sales, rentals and real estate consulting",
    href: "/servicii-imobiliare",
    matchCategories: ["Imobiliare"],
    matchTags: ["vânzare", "cumpărare", "imobiliare", "închiriere"],
  },
  {
    label: "apartamentele disponibile pentru cazare",
    labelEn: "apartments available for stays",
    href: "/cazare",
    matchCategories: ["Cazare", "Turism", "Guest Experience", "Ghid turistic Timișoara"],
    matchTags: ["cazare", "apartament", "sejur", "turist"],
  },
  {
    label: "evaluare gratuită a proprietății",
    labelEn: "free property valuation",
    href: "/evaluare-gratuita",
    matchCategories: ["Proprietari", "Imobiliare", "Management"],
    matchTags: ["evaluare", "estimare", "preț", "vânzare"],
  },
];

interface InternalLinksProps {
  category: string;
  tags: string[];
  currentSlug?: string;
}

const InternalLinks = ({ category, tags, currentSlug }: InternalLinksProps) => {
  const { language } = useLanguage();
  const lowerTags = tags.map((t) => t.toLowerCase());

  // Fetch related blog articles by same category
  const { data: relatedArticles } = useQuery({
    queryKey: ["related-articles", category, currentSlug],
    queryFn: async () => {
      const { data } = await supabase
        .from("blog_articles")
        .select("slug, title, title_en")
        .eq("is_published", true)
        .eq("category", category)
        .neq("slug", currentSlug || "")
        .order("view_count", { ascending: false })
        .limit(3);
      return data || [];
    },
    staleTime: Infinity,
    gcTime: Infinity,
    placeholderData: keepPreviousData,
    enabled: !!category,
  });

  const relevantLinks = SITE_LINKS.filter((link) => {
    const catMatch = link.matchCategories.some(
      (c) => c.toLowerCase() === category.toLowerCase()
    );
    const tagMatch = link.matchTags.some((t) => lowerTags.includes(t.toLowerCase()));
    return catMatch || tagMatch;
  }).slice(0, 3);

  const hasContent = relevantLinks.length > 0 || (relatedArticles && relatedArticles.length > 0);
  if (!hasContent) return null;

  return (
    <nav
      aria-label={language === "ro" ? "Linkuri utile" : "Useful links"}
      className="my-8 p-5 rounded-xl border border-border bg-muted/30"
    >
      {/* Related blog articles */}
      {relatedArticles && relatedArticles.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5" />
            {language === "ro" ? "Articole similare" : "Related articles"}
          </h3>
          <ul className="space-y-2">
            {relatedArticles.map((article) => (
              <li key={article.slug}>
                <Link
                  to={`/blog/${article.slug}`}
                  className="inline-flex items-center gap-2 text-primary hover:underline text-sm font-medium"
                >
                  <ArrowRight className="w-3 h-3" />
                  {language === "en" && article.title_en ? article.title_en : article.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Site page links */}
      {relevantLinks.length > 0 && (
        <>
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
        </>
      )}
    </nav>
  );
};

export default InternalLinks;
