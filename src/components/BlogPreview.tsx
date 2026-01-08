import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/i18n/LanguageContext";
import { PrefetchLink } from "@/components/PrefetchLink";

interface BlogArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  cover_image: string | null;
  category: string;
  published_at: string | null;
  created_at: string;
}

const translations = {
  ro: {
    title: "Ultimele Articole",
    subtitle: "Sfaturi și informații utile despre închirierea pe termen scurt",
    readMore: "Citește articolul",
    viewAll: "Vezi toate articolele",
    minRead: "min citire",
  },
  en: {
    title: "Latest Articles",
    subtitle: "Tips and useful information about short-term rentals",
    readMore: "Read article",
    viewAll: "View all articles",
    minRead: "min read",
  },
};

const BlogPreview = () => {
  const { language } = useLanguage();
  const t = translations[language];

  const { data: articles, isLoading } = useQuery({
    queryKey: ["blog-preview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_articles")
        .select("id, title, slug, excerpt, cover_image, category, published_at, created_at")
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(3);

      if (error) throw error;
      return data as BlogArticle[];
    },
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === "ro" ? "ro-RO" : "en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const calculateReadTime = (excerpt: string) => {
    const wordsPerMinute = 200;
    const words = excerpt.split(/\s+/).length * 5;
    return Math.max(1, Math.ceil(words / wordsPerMinute));
  };

  if (isLoading) {
    return (
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Skeleton className="h-10 w-64 mx-auto mb-4" />
            <Skeleton className="h-6 w-96 mx-auto" />
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-20 mb-3" />
                  <Skeleton className="h-6 w-full mb-2" />
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!articles || articles.length === 0) {
    return null;
  }

  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t.title}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t.subtitle}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {articles.map((article) => (
            <PrefetchLink key={article.id} to={`/blog/${article.slug}`} blogSlug={article.slug}>
              <Card className="overflow-hidden h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group">
                {article.cover_image ? (
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={article.cover_image}
                      alt={article.title}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <span className="text-4xl">📝</span>
                  </div>
                )}
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-3">
                    <Badge variant="secondary" className="text-xs">
                      {article.category}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{calculateReadTime(article.excerpt)} {t.minRead}</span>
                    </div>
                  </div>
                  <h3 className="font-semibold text-lg text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                    {article.title}
                  </h3>
                  <p className="text-muted-foreground text-sm line-clamp-2 mb-4">
                    {article.excerpt}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(article.published_at || article.created_at)}</span>
                    </div>
                    <span className="text-primary text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                      {t.readMore}
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </PrefetchLink>
          ))}
        </div>

        <div className="text-center mt-12">
          <Button asChild variant="outline" size="lg">
            <Link to="/blog" className="gap-2">
              {t.viewAll}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default BlogPreview;
