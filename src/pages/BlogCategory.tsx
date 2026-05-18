import { useEffect, useMemo } from "react";
import { useParams, Link, Navigate, useSearchParams } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Eye, ArrowRight, Tag } from "lucide-react";
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
import { findBlogCategoryBySlug, BLOG_CATEGORIES } from "@/lib/blogCategories";
import { generateBreadcrumbSchema } from "@/utils/schemaGenerators";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

const PAGE_SIZE = 9;

interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  cover_image: string | null;
  category: string;
  published_at: string | null;
  created_at: string;
  view_count: number;
}

const BlogCategory = () => {
  const { slug = "" } = useParams<{ slug: string }>();
  const { language } = useLanguage();
  const dateLocale = language === "ro" ? ro : enUS;
  const meta = findBlogCategoryBySlug(slug);
  const [searchParams, setSearchParams] = useSearchParams();
  const pageParam = parseInt(searchParams.get("page") || "1", 10);
  const page = Number.isFinite(pageParam) && pageParam >= 1 ? pageParam : 1;

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [slug, page]);

  const { data: articles, isLoading } = useQuery({
    queryKey: ["blog-category", slug],
    enabled: !!meta,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_articles")
        .select("id, slug, title, excerpt, cover_image, category, published_at, created_at, view_count")
        .eq("is_published", true)
        .in("category", meta!.dbCategories)
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data as Article[];
    },
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });

  if (!meta) return <Navigate to="/blog" replace />;

  const total = articles?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const paged = useMemo(
    () => (articles ?? []).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [articles, page]
  );

  const breadcrumbItems = [
    { label: "Blog", href: "/blog" },
    { label: meta.name },
  ];

  const schemas = [
    generateBreadcrumbSchema([
      { name: "Acasă", url: "https://realtrust.ro" },
      { name: "Blog", url: "https://realtrust.ro/blog" },
      { name: meta.name, url: `https://realtrust.ro/blog/categorie/${meta.slug}` },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: meta.title,
      description: meta.description,
      url: `https://realtrust.ro/blog/categorie/${meta.slug}`,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={meta.title}
        description={meta.description}
        url={`https://realtrust.ro/blog/categorie/${meta.slug}`}
        jsonLd={schemas}
      />
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-6">
          <PageBreadcrumb items={breadcrumbItems} className="mb-8" />

          <div className="text-center mb-10">
            <Badge variant="secondary" className="mb-3">{meta.name}</Badge>
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4">
              {meta.title}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">{meta.intro}</p>
            <Button asChild size="lg">
              <Link to={meta.ctaHref}>{meta.ctaLabel} <ArrowRight className="w-4 h-4 ml-2" /></Link>
            </Button>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {BLOG_CATEGORIES.map((c) => (
              <Link
                key={c.slug}
                to={`/blog/categorie/${c.slug}`}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  c.slug === meta.slug
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:border-primary/40 hover:text-primary"
                }`}
              >
                {c.name}
              </Link>
            ))}
            <Link
              to="/blog"
              className="rounded-full border border-border px-3 py-1.5 text-sm hover:border-primary/40 hover:text-primary"
            >
              Toate articolele
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => <BlogCardSkeleton key={i} />)}
            </div>
          ) : total === 0 ? (
            <div className="text-center py-20">
              <Tag className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">Nu există încă articole în această categorie.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paged.map((article) => {
                  const coverImage = getBlogCoverImage(article.slug, article.cover_image);
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

              {totalPages > 1 && (
                <Pagination className="mt-12">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => { e.preventDefault(); setPage((p) => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        aria-disabled={page === 1}
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }).map((_, i) => {
                      const n = i + 1;
                      const show = n === 1 || n === totalPages || Math.abs(n - page) <= 1;
                      if (!show) {
                        if (n === 2 || n === totalPages - 1) {
                          return <PaginationItem key={n}><PaginationEllipsis /></PaginationItem>;
                        }
                        return null;
                      }
                      return (
                        <PaginationItem key={n}>
                          <PaginationLink
                            href="#"
                            isActive={n === page}
                            onClick={(e) => { e.preventDefault(); setPage(n); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                          >{n}</PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => { e.preventDefault(); setPage((p) => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        aria-disabled={page === totalPages}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
      <GlobalConversionWidgets />
      <BackToTop />
    </div>
  );
};

export default BlogCategory;
