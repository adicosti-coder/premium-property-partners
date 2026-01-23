import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AccessibilityPanel from "@/components/AccessibilityPanel";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, Search, Tag, ArrowRight, ArrowUpDown, Sparkles } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ro, enUS } from "date-fns/locale";
import { getBlogCoverImage } from "@/utils/blogImageMap";

interface BlogArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  cover_image: string | null;
  category: string;
  tags: string[];
  author_name: string;
  published_at: string | null;
  created_at: string;
}

type SortOption = "newest" | "oldest" | "title";

const Blog = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const dateLocale = language === "ro" ? ro : enUS;
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  const { data: articles, isLoading } = useQuery({
    queryKey: ["blog-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_articles")
        .select("*")
        .eq("is_published", true)
        .order("published_at", { ascending: false });

      if (error) throw error;
      return data as BlogArticle[];
    },
  });

  const categories = useMemo(() => {
    if (!articles) return [];
    const cats = new Set(articles.map((a) => a.category));
    return Array.from(cats);
  }, [articles]);

  const filteredArticles = useMemo(() => {
    if (!articles) return [];
    const query = searchQuery.toLowerCase().trim();
    const filtered = articles.filter((article) => {
      const matchesSearch =
        query === "" ||
        article.title.toLowerCase().includes(query) ||
        article.excerpt.toLowerCase().includes(query) ||
        article.tags.some((tag) => tag.toLowerCase().includes(query)) ||
        article.category.toLowerCase().includes(query);
      const matchesCategory =
        !selectedCategory || article.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    // Sort articles
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return new Date(a.published_at || a.created_at).getTime() - 
                 new Date(b.published_at || b.created_at).getTime();
        case "title":
          return a.title.localeCompare(b.title, language);
        case "newest":
        default:
          return new Date(b.published_at || b.created_at).getTime() - 
                 new Date(a.published_at || a.created_at).getTime();
      }
    });
  }, [articles, searchQuery, selectedCategory, sortBy, language]);

  const translations = {
    ro: {
      title: "Blog",
      subtitle: "Sfaturi, noutăți și ghiduri pentru proprietari și oaspeți",
      search: "Caută articole...",
      allCategories: "Toate",
      noArticles: "Niciun articol găsit",
      noArticlesDescription: "Încearcă să modifici filtrele de căutare.",
      readMore: "Citește mai mult",
      minRead: "min citire",
      sortBy: "Sortare",
      newest: "Cele mai noi",
      oldest: "Cele mai vechi",
      titleSort: "Alfabetic",
      promoTitle: "Rezervă direct și economisește 5%!",
      promoDescription: "Folosește codul DIRECT5 pentru 5% reducere la orice rezervare directă.",
      promoButton: "Află mai multe",
    },
    en: {
      title: "Blog",
      subtitle: "Tips, news and guides for owners and guests",
      search: "Search articles...",
      allCategories: "All",
      noArticles: "No articles found",
      noArticlesDescription: "Try adjusting your search filters.",
      readMore: "Read more",
      minRead: "min read",
      sortBy: "Sort by",
      newest: "Newest",
      oldest: "Oldest",
      titleSort: "Alphabetical",
      promoTitle: "Book direct and save 5%!",
      promoDescription: "Use code DIRECT5 for 5% off any direct booking.",
      promoButton: "Learn more",
    },
  };

  const t = translations[language] || translations.ro;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-6">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4">
              {t.title}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t.subtitle}
            </p>
          </div>

          {/* Promo Banner */}
          <div className="mb-8 p-6 bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 border border-primary/20 rounded-xl">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{t.promoTitle}</h3>
                  <p className="text-sm text-muted-foreground">{t.promoDescription}</p>
                </div>
              </div>
              <Button onClick={() => navigate("/rezerva-direct")} className="shrink-0">
                {t.promoButton}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t.search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(null)}
              >
                {t.allCategories}
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </Button>
              ))}
              <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                <SelectTrigger className="w-[160px] h-8">
                  <ArrowUpDown className="w-3 h-3 mr-2" />
                  <SelectValue placeholder={t.sortBy} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">{t.newest}</SelectItem>
                  <SelectItem value="oldest">{t.oldest}</SelectItem>
                  <SelectItem value="title">{t.titleSort}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Articles Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
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
          ) : filteredArticles.length === 0 ? (
            <div className="text-center py-20">
              <Tag className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {t.noArticles}
              </h3>
              <p className="text-muted-foreground">{t.noArticlesDescription}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredArticles.map((article) => {
                const coverImage = getBlogCoverImage(article.slug, article.cover_image);
                return (
                <Link key={article.id} to={`/blog/${article.slug}`}>
                  <Card className="overflow-hidden h-full hover:shadow-lg transition-shadow group">
                    {coverImage && (
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={coverImage}
                          alt={article.title}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <Badge className="absolute top-3 left-3">
                          {article.category}
                        </Badge>
                      </div>
                    )}
                    <CardContent className="p-6">
                      {!coverImage && (
                        <Badge className="mb-3">{article.category}</Badge>
                      )}
                      <h2 className="text-xl font-serif font-semibold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
                        {article.title}
                      </h2>
                      <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                        {article.excerpt}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-4">
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
                            {Math.ceil(article.excerpt.length / 200)} {t.minRead}
                          </span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );})}
            </div>
          )}
        </div>
      </main>

      <Footer />
      <AccessibilityPanel />
    </div>
  );
};

export default Blog;
