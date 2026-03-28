import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/i18n/LanguageContext";
import { BookOpen, ArrowRight } from "lucide-react";

interface Article {
  id: string;
  slug: string;
  title: string;
  title_en: string | null;
  excerpt: string;
  excerpt_en: string | null;
  cover_image: string | null;
  category: string;
  published_at: string | null;
}

interface RelatedBlogGuidesProps {
  propertyLocation?: string;
  propertyName?: string;
  listingType?: string | null;
}

const RelatedBlogGuides = ({ propertyLocation, listingType }: RelatedBlogGuidesProps) => {
  const { language } = useLanguage();
  const [articles, setArticles] = useState<Article[]>([]);
  const isRo = language === "ro";

  useEffect(() => {
    const fetchArticles = async () => {
      // Build search terms based on property context
      const searchTerms: string[] = [];
      
      if (listingType === "vanzare" || listingType === "investitie") {
        searchTerms.push("investit", "roi", "randament", "vanzare");
      }
      if (propertyLocation) {
        const loc = propertyLocation.toLowerCase();
        if (loc.includes("timișoara") || loc.includes("timisoara")) {
          searchTerms.push("timișoara", "timisoara");
        }
        // Extract neighborhood
        const parts = propertyLocation.split(",").map(s => s.trim());
        if (parts.length > 1) searchTerms.push(parts[0].toLowerCase());
      }
      searchTerms.push("ghid", "administrare", "hotelier");

      // Fetch recent published articles
      const { data } = await supabase
        .from("blog_articles")
        .select("id, slug, title, title_en, excerpt, excerpt_en, cover_image, category, published_at")
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(20);

      if (!data || data.length === 0) return;

      // Score articles by relevance
      const scored = data.map(article => {
        let score = 0;
        const text = `${article.title} ${article.excerpt} ${article.category}`.toLowerCase();
        for (const term of searchTerms) {
          if (text.includes(term)) score += 1;
        }
        // Boost investment-related categories
        if (["investitii", "ghid", "piata"].includes(article.category?.toLowerCase())) score += 2;
        return { ...article, score };
      });

      // Sort by relevance then recency, take top 3
      scored.sort((a, b) => b.score - a.score || 
        new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime());
      
      setArticles(scored.slice(0, 3));
    };

    fetchArticles();
  }, [propertyLocation, listingType]);

  if (articles.length === 0) return null;

  return (
    <section className="py-12 md:py-16">
      <div className="container mx-auto px-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-serif font-bold text-foreground">
              {isRo ? "Ghiduri Relevante" : "Related Guides"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isRo ? "Articole care te pot ajuta în decizia ta" : "Articles to help with your decision"}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {articles.map((article) => {
            const title = (language === "en" && article.title_en) ? article.title_en : article.title;
            const excerpt = (language === "en" && article.excerpt_en) ? article.excerpt_en : article.excerpt;

            return (
              <Link
                key={article.id}
                to={`/blog/${article.slug}`}
                className="group bg-card rounded-xl border border-border overflow-hidden hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
              >
                {article.cover_image && (
                  <div className="h-40 overflow-hidden">
                    <img
                      src={article.cover_image}
                      alt={title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="p-5">
                  <span className="inline-block px-2.5 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full mb-3">
                    {article.category}
                  </span>
                  <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-2">
                    {title}
                  </h4>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {excerpt}
                  </p>
                  <span className="inline-flex items-center gap-1 text-sm text-primary font-medium">
                    {isRo ? "Citește" : "Read"}
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default RelatedBlogGuides;
