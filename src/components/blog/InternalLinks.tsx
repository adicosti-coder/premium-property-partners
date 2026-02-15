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
    href: "/pentru-proprietari",
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
