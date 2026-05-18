import { useEffect, useMemo, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
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

const BlogLocation = () => {
  const { location: locationParam = "" } = useParams<{ location: string }>();
  const { language } = useLanguage();
  const dateLocale = language === "ro" ? ro : enUS;
  const [page, setPage] = useState(1);

  const locationSlug = slugifyLocation(locationParam);

  useEffect(() => {
    setPage(1);
    window.scrollTo({ top: 0 });
  }, [locationSlug]);

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

  if (!locationSlug) return <Navigate to="/blog" replace />;

  const displayName =
    articles && articles.length > 0 && articles[0].geo_location
      ? articles[0].geo_location
      : prettifyLocationSlug(locationSlug);

  const total = articles?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const paged = useMemo(
    () => (articles ?? []).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [articles, page]
  );

  const canonicalUrl = `https://realtrust.ro/blog/locatie/${locationSlug}`;
  const pageTitle = `Blog Imobiliar ${displayName} | RealTrust`;
  const pageDescription = `Articole, ghiduri și analize despre piața imobiliară din ${displayName}. Investiții, regim hotelier, sfaturi locale.`;

  const breadcrumbItems = [
    { label: "Blog", href: "/blog" },
    { label: displayName },
  ];

  const schemas: Record<string, unknown>[] = [
    generateBreadcrumbSchema([
      { name: "Acasă", url: "https://realtrust.ro" },
      { name: "Blog", url: "https://realtrust.ro/blog" },
      { name: displayName, url: canonicalUrl },
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

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={pageTitle}
        description={pageDescription}
        url={canonicalUrl}
        jsonLd={schemas}
      />
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-6">
          <PageBreadcrumb items={breadcrumbItems} className="mb-8" />

          <div className="text-center mb-12">
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
            <div className="flex justify-center gap-2 mt-12">
              <button
                disabled={page === 1}
                onClick={() => { setPage((p) => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className="px-4 py-2 rounded border border-border disabled:opacity-40"
              >
                ← Anterior
              </button>
              <span className="px-4 py-2 text-sm text-muted-foreground">
                Pagina {page} din {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className="px-4 py-2 rounded border border-border disabled:opacity-40"
              >
                Următor →
              </button>
            </div>
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
