import { useEffect, useMemo } from "react";
import { useParams, Link, Navigate, useSearchParams } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Eye, ArrowRight, MapPin } from "lucide-react";
import { format } from "date-fns";
import { ro, enUS } from "date-fns/locale";
import { useLanguage } from "@/i18n/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import BackToTop from "@/components/BackToTop";
import GlobalConversionWidgets from "@/components/GlobalConversionWidgets";
import BlogCardSkeleton from "@/components/BlogCardSkeleton";
import { getBlogCoverImage } from "@/utils/blogImageMap";
import { generateBreadcrumbSchema } from "@/utils/schemaGenerators";
import { slugifyLocation, prettifyLocationSlug } from "@/lib/blogLocations";

const PAGE_SIZE = 9;
const CANONICAL_BASE = "https://realtrust.ro";

interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  cover_image: string | null;
  main_image_url: string | null;
  category: string;
  geo_location: string | null;
  published_at: string | null;
  created_at: string;
  view_count: number;
}

interface LocationSummary {
  slug: string;
  displayName: string;
  count: number;
}

const BlogLocation = () => {
  const { location: locationParam = "" } = useParams<{ location: string }>();
  const { language } = useLanguage();
  const dateLocale = language === "ro" ? ro : enUS;
  const [searchParams, setSearchParams] = useSearchParams();

  const locationSlug = slugifyLocation(locationParam);
  const pageParam = parseInt(searchParams.get("page") || "1", 10);
  const page = Number.isFinite(pageParam) && pageParam >= 1 ? pageParam : 1;

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [locationSlug, page]);

  // Current location articles
  const { data: articles, isLoading } = useQuery({
    queryKey: ["blog-location", locationSlug],
    enabled: !!locationSlug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_articles")
        .select(
          "id, slug, title, excerpt, cover_image, main_image_url, category, geo_location, published_at, created_at, view_count"
        )
        .eq("is_published", true)
        .not("geo_location", "is", null)
        .order("published_at", { ascending: false });
      if (error) throw error;
      return (data as Article[]).filter(
        (a) => a.geo_location && slugifyLocation(a.geo_location) === locationSlug
      );
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  // All distinct locations (for cross-linking)
  const { data: allLocations } = useQuery({
    queryKey: ["blog-locations-index"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_articles")
        .select("geo_location")
        .eq("is_published", true)
        .not("geo_location", "is", null);
      if (error) throw error;
      const map = new Map<string, LocationSummary>();
      for (const row of (data ?? []) as { geo_location: string | null }[]) {
        if (!row.geo_location) continue;
        const slug = slugifyLocation(row.geo_location);
        if (!slug) continue;
        const prev = map.get(slug);
        if (prev) prev.count += 1;
        else map.set(slug, { slug, displayName: row.geo_location, count: 1 });
      }
      return Array.from(map.values()).sort((a, b) => b.count - a.count);
    },
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const displayName =
    articles && articles.length > 0 && articles[0].geo_location
      ? articles[0].geo_location
      : prettifyLocationSlug(locationSlug);

  const total = articles?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(
    () => (articles ?? []).slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [articles, safePage]
  );

  if (!locationSlug) return <Navigate to="/blog" replace />;

  const goToPage = (n: number) => {
    const next = new URLSearchParams(searchParams);
    if (n <= 1) next.delete("page");
    else next.set("page", String(n));
    setSearchParams(next, { replace: false });
  };

  const pathBase = `/blog/locatie/${locationSlug}`;
  // Self-referential canonical per page (Google deprecated rel=prev/next).
  // Page 1 canonicalizes to clean URL; deeper pages keep ?page=N to avoid
  // GSC "alternative page with canonical tag" duplicates.
  const canonicalQuery = safePage > 1 ? `?page=${safePage}` : undefined;
  const canonicalUrl = `${CANONICAL_BASE}${pathBase}${canonicalQuery ?? ""}`;

  const pageSuffix = safePage > 1 ? ` — Pagina ${safePage}` : "";
  const pageTitle = `Blog Imobiliar ${displayName}${pageSuffix} | RealTrust`;
  const pageDescription = `Articole, ghiduri și analize despre piața imobiliară din ${displayName}. Investiții, regim hotelier, sfaturi locale.`;

  const breadcrumbItems = [
    { label: "Blog", href: "/blog" },
    { label: displayName },
  ];

  const schemas: Record<string, unknown>[] = [
    generateBreadcrumbSchema([
      { name: "Acasă", url: CANONICAL_BASE },
      { name: "Blog", url: `${CANONICAL_BASE}/blog` },
      { name: displayName, url: `${CANONICAL_BASE}${pathBase}` },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: pageTitle,
      description: pageDescription,
      url: canonicalUrl,
      about: {
        "@type": "Place",
        name: displayName,
        containedInPlace: { "@type": "City", name: "Timișoara" },
      },
    },
  ];

  const otherLocations = (allLocations ?? []).filter((l) => l.slug !== locationSlug);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={pageTitle}
        description={pageDescription}
        url={pathBase}
        canonicalQuery={canonicalQuery}
        jsonLd={schemas}
      />
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-6">
          <PageBreadcrumb items={breadcrumbItems} className="mb-8" />

          <div className="text-center mb-10">
            <Badge variant="secondary" className="mb-3 inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> {displayName}
            </Badge>
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4">
              Blog imobiliar — {displayName}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Toate articolele noastre despre piața, investițiile și viața în {displayName}.
            </p>
          </div>

          {/* Cross-linking: other location hubs (top, pill-style) */}
          {otherLocations.length > 0 && (
            <nav
              aria-label="Alte locații din Timișoara"
              className="flex flex-wrap justify-center gap-2 mb-10"
            >
              <Link
                to="/blog"
                className="rounded-full border border-border px-3 py-1.5 text-sm hover:border-primary/40 hover:text-primary transition-colors"
              >
                Toate articolele
              </Link>
              {otherLocations.slice(0, 12).map((loc) => (
                <Link
                  key={loc.slug}
                  to={`/blog/locatie/${loc.slug}`}
                  className="rounded-full border border-border px-3 py-1.5 text-sm hover:border-primary/40 hover:text-primary transition-colors"
                >
                  {loc.displayName}
                  <span className="ml-1 text-xs text-muted-foreground">({loc.count})</span>
                </Link>
              ))}
            </nav>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => <BlogCardSkeleton key={i} />)}
            </div>
          ) : total === 0 ? (
            <div className="text-center py-20">
              <MapPin className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">
                Nu există încă articole pentru această locație.
              </p>
              <Link to="/blog" className="text-primary hover:underline mt-4 inline-block">
                ← Înapoi la blog
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paged.map((article) => {
                const coverImage =
                  article.main_image_url || getBlogCoverImage(article.slug, article.cover_image);
                return (
                  <Link key={article.id} to={`/blog/${article.slug}`}>
                    <Card className="overflow-hidden h-full hover:shadow-lg transition-shadow group">
                      <div className="relative h-48 overflow-hidden bg-muted/40">
                        {coverImage ? (
                          <img
                            src={coverImage}
                            alt={article.title}
                            loading="lazy"
                            decoding="async"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl opacity-50">📝</div>
                        )}
                        <Badge className="absolute top-3 left-3">{article.category}</Badge>
                      </div>
                      <CardContent className="p-6">
                        <h2 className="text-xl font-serif font-semibold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
                          {article.title}
                        </h2>
                        <p className="text-muted-foreground text-sm mb-4 line-clamp-3">{article.excerpt}</p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(article.published_at || article.created_at), "d MMM yyyy", { locale: dateLocale })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {Math.ceil((article.excerpt?.length || 0) / 200)} min
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {(article.view_count || 0).toLocaleString()}
                            </span>
                          </div>
                          <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-3 mt-12">
              <Link
                to={safePage > 1 ? `${pathBase}${safePage - 1 > 1 ? `?page=${safePage - 1}` : ""}` : "#"}
                onClick={(e) => { e.preventDefault(); if (safePage > 1) goToPage(safePage - 1); }}
                aria-disabled={safePage === 1}
                className={`px-4 py-2 rounded border border-border text-sm transition-colors ${safePage === 1 ? "opacity-40 pointer-events-none" : "hover:border-primary/40 hover:text-primary"}`}
              >
                ← Anterior
              </Link>
              <span className="px-4 py-2 text-sm text-muted-foreground">
                Pagina {safePage} din {totalPages}
              </span>
              <Link
                to={safePage < totalPages ? `${pathBase}?page=${safePage + 1}` : "#"}
                onClick={(e) => { e.preventDefault(); if (safePage < totalPages) goToPage(safePage + 1); }}
                aria-disabled={safePage === totalPages}
                className={`px-4 py-2 rounded border border-border text-sm transition-colors ${safePage === totalPages ? "opacity-40 pointer-events-none" : "hover:border-primary/40 hover:text-primary"}`}
              >
                Următor →
              </Link>
            </div>
          )}

          {/* Cross-linking footer: complete location index for SEO + UX */}
          {otherLocations.length > 0 && (
            <section className="mt-20 pt-10 border-t border-border">
              <h2 className="text-2xl font-serif font-semibold text-foreground mb-2 text-center">
                Explorează alte zone din Timișoara
              </h2>
              <p className="text-sm text-muted-foreground text-center mb-8 max-w-xl mx-auto">
                Conținut local dedicat fiecărui cartier și complex — ghiduri, analize de piață și oportunități de investiție.
              </p>
              <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {otherLocations.map((loc) => (
                  <li key={loc.slug}>
                    <Link
                      to={`/blog/locatie/${loc.slug}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-3 hover:border-primary/40 hover:bg-primary/5 transition-colors group"
                    >
                      <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <MapPin className="w-3.5 h-3.5 text-primary/70 flex-shrink-0" />
                        {loc.displayName}
                      </span>
                      <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                        {loc.count} {loc.count === 1 ? "articol" : "articole"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>
      <Footer />
      <GlobalConversionWidgets />
      <BackToTop />
    </div>
  );
};

export default BlogLocation;
