import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import { ro, enUS } from "date-fns/locale";
import { getBlogCoverImage } from "@/utils/blogImageMap";

interface RelatedArticlesProps {
  currentArticleId: string;
  category: string;
  tags: string[];
}

interface BlogArticle {
  id: string;
  slug: string;
  title: string;
  title_en: string | null;
  excerpt: string;
  excerpt_en: string | null;
  content: string;
  cover_image: string | null;
  category: string;
  tags: string[];
  published_at: string | null;
  created_at: string;
}

const RelatedArticles = ({ currentArticleId, category, tags }: RelatedArticlesProps) => {
  const { language } = useLanguage();
  const dateLocale = language === "ro" ? ro : enUS;

  const { data: relatedArticles, isLoading } = useQuery({
    queryKey: ["related-articles", currentArticleId, category, tags],
    queryFn: async () => {
      // Fetch articles in same category or with matching tags
      const { data, error } = await supabase
        .from("blog_articles")
        .select("*")
        .eq("is_published", true)
        .neq("id", currentArticleId)
        .order("published_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      // Score and sort by relevance
      const scored = (data as BlogArticle[]).map((article) => {
        let score = 0;
        
        // Category match gives higher score
        if (article.category === category) {
          score += 3;
        }
        
        // Each matching tag adds to score
        const matchingTags = article.tags.filter((tag) => tags.includes(tag));
        score += matchingTags.length * 2;
        
        return { ...article, score };
      });

      // Sort by score and take top 3
      return scored
        .filter((a) => a.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
    },
  });

  const translations = {
    ro: {
      title: "Articole Similare",
      noArticles: "Nu există articole similare.",
      minRead: "min citire",
    },
    en: {
      title: "Related Articles",
      noArticles: "No related articles found.",
      minRead: "min read",
    },
  };

  const t = translations[language] || translations.ro;

  if (isLoading) {
    return (
      <section className="mt-12 pt-8 border-t border-border">
        <h2 className="text-2xl font-serif font-bold text-foreground mb-6">
          {t.title}
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="aspect-video bg-muted" />
              <CardContent className="p-4">
                <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                <div className="h-5 bg-muted rounded w-full mb-2" />
                <div className="h-4 bg-muted rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  if (!relatedArticles || relatedArticles.length === 0) {
    return null;
  }

  return (
    <section className="mt-12 pt-8 border-t border-border">
      <h2 className="text-2xl font-serif font-bold text-foreground mb-6">
        {t.title}
      </h2>
      <div className="grid gap-6 md:grid-cols-3">
        {relatedArticles.map((article) => {
          const displayTitle = language === "en" && article.title_en 
            ? article.title_en 
            : article.title;
          const displayExcerpt = language === "en" && article.excerpt_en 
            ? article.excerpt_en 
            : article.excerpt;
          const readingTime = Math.ceil(article.content.length / 1000);
          const coverImage = getBlogCoverImage(article.slug, article.cover_image);

          return (
            <Link 
              key={article.id} 
              to={`/blog/${article.slug}`}
              className="group"
            >
              <Card className="h-full overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                {coverImage && (
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={coverImage}
                      alt={displayTitle}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                )}
                <CardContent className="p-4">
                  <Badge variant="secondary" className="mb-2 text-xs">
                    {article.category}
                  </Badge>
                  <h3 className="font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                    {displayTitle}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {displayExcerpt}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(
                        new Date(article.published_at || article.created_at),
                        "d MMM yyyy",
                        { locale: dateLocale }
                      )}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {readingTime} {t.minRead}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default RelatedArticles;
