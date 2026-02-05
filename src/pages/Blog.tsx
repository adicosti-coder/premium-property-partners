import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/i18n/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, Search, Tag, ArrowRight, ArrowUpDown, Sparkles, Lock, Crown, Eye, TrendingUp, PenLine, Trophy } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ro, enUS } from "date-fns/locale";
import { getBlogCoverImage } from "@/utils/blogImageMap";
import { User } from "@supabase/supabase-js";
import SEOHead from "@/components/SEOHead";
import GlobalConversionWidgets from "@/components/GlobalConversionWidgets";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import BackToTop from "@/components/BackToTop";


interface BlogArticle {
  id: string;
  slug: string;
  title: string;
  title_en: string | null;
  excerpt: string;
  excerpt_en: string | null;
  cover_image: string | null;
  category: string;
  tags: string[];
  author_name: string;
  published_at: string | null;
  created_at: string;
  is_premium: boolean;
  view_count: number;
}

type SortOption = "newest" | "oldest" | "title" | "popular";
type AccessFilter = "all" | "public" | "premium";

const Blog = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const dateLocale = language === "ro" ? ro : enUS;
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [accessFilter, setAccessFilter] = useState<AccessFilter>("all");
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

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
    staleTime: Infinity, // Never consider data stale
    gcTime: Infinity, // Never garbage collect
    retry: 2,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    placeholderData: keepPreviousData,
  });

  const categories = useMemo(() => {
    if (!articles) return [];
    const cats = new Set(articles.map((a) => a.category));
    return Array.from(cats);
  }, [articles]);

  // Get top 3 trending article IDs based on view count
  const trendingArticleIds = useMemo(() => {
    if (!articles) return new Set<string>();
    const sorted = [...articles]
      .filter(a => (a.view_count || 0) > 0)
      .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
      .slice(0, 3)
      .map(a => a.id);
    return new Set(sorted);
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
      const matchesAccess =
        accessFilter === "all" ||
        (accessFilter === "public" && !article.is_premium) ||
        (accessFilter === "premium" && article.is_premium);
      return matchesSearch && matchesCategory && matchesAccess;
    });

    // Sort articles
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return new Date(a.published_at || a.created_at).getTime() - 
                 new Date(b.published_at || b.created_at).getTime();
        case "title":
          return a.title.localeCompare(b.title, language);
        case "popular":
          return (b.view_count || 0) - (a.view_count || 0);
        case "newest":
        default:
          return new Date(b.published_at || b.created_at).getTime() - 
                 new Date(a.published_at || a.created_at).getTime();
      }
    });
  }, [articles, searchQuery, selectedCategory, accessFilter, sortBy, language]);

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
      popular: "Cele mai populare",
      communityTitle: "Scrie și câștigă!",
      communityDesc: "Trimite un articol și poți câștiga o noapte gratuită de cazare.",
      communityBtn: "Participă la concurs",
      promoTitle: "Rezervă direct și economisește 5%!",
      promoDescription: "Folosește codul DIRECT5 pentru 5% reducere la orice rezervare directă.",
      promoButton: "Află mai multe",
      premiumBadge: "Premium",
      trendingBadge: "Trending",
      loginToRead: "Autentifică-te pentru a citi",
      accessAll: "Toate",
      accessPublic: "Publice",
      accessPremium: "Premium",
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
      popular: "Most popular",
      communityTitle: "Write and win!",
      communityDesc: "Submit an article and you could win a free night stay.",
      communityBtn: "Join the contest",
      promoTitle: "Book direct and save 5%!",
      promoDescription: "Use code DIRECT5 for 5% off any direct booking.",
      promoButton: "Learn more",
      premiumBadge: "Premium",
      trendingBadge: "Trending",
      loginToRead: "Login to read",
      accessAll: "All",
      accessPublic: "Public",
      accessPremium: "Premium",
    },
  };

  const t = translations[language] || translations.ro;

  const seoContent = {
    ro: {
      title: "Blog | Sfaturi Proprietari & Oaspeți | RealTrust & ApArt Hotel",
      description: "Articole, ghiduri și sfaturi pentru proprietari și oaspeți. Maximizează randamentul proprietății tale. Citește acum!"
    },
    en: {
      title: "Blog | Tips for Owners & Guests | RealTrust & ApArt Hotel",
      description: "Articles, guides and tips for property owners and guests. Maximize your property returns. Read now!"
    }
  };

  const seo = seoContent[language as keyof typeof seoContent] || seoContent.ro;

  const breadcrumbItems = [
    { label: "Blog" }
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title={seo.title}
        description={seo.description}
        url="https://realtrust.ro/blog"
      />
      <Header />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-6">
          {/* Breadcrumb */}
          <PageBreadcrumb items={breadcrumbItems} className="mb-8" />

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

          {/* Community Contest Banner */}
          <div className="mb-8 p-6 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-rose-500/10 border border-amber-500/20 rounded-xl">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-full">
                  <Trophy className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{t.communityTitle}</h3>
                  <p className="text-sm text-muted-foreground">{t.communityDesc}</p>
                </div>
              </div>
              <Button onClick={() => navigate("/comunitate")} variant="outline" className="shrink-0 border-amber-500/50 hover:bg-amber-500/10">
                <PenLine className="w-4 h-4 mr-2" />
                {t.communityBtn}
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-4 mb-8">
            <div className="flex flex-col sm:flex-row gap-4">
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
                <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                  <SelectTrigger className="w-[160px] h-8">
                    <ArrowUpDown className="w-3 h-3 mr-2" />
                    <SelectValue placeholder={t.sortBy} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">{t.newest}</SelectItem>
                    <SelectItem value="oldest">{t.oldest}</SelectItem>
                    <SelectItem value="popular">{t.popular}</SelectItem>
                    <SelectItem value="title">{t.titleSort}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Category and Access Filters */}
            <div className="flex flex-wrap gap-2 items-center">
              {/* Category Filters */}
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
              
              {/* Separator */}
              <div className="h-6 w-px bg-border mx-2 hidden sm:block" />
              
              {/* Access Filter */}
              <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
                <Button
                  variant={accessFilter === "all" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setAccessFilter("all")}
                  className="h-7 px-3"
                >
                  {t.accessAll}
                </Button>
                <Button
                  variant={accessFilter === "public" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setAccessFilter("public")}
                  className="h-7 px-3"
                >
                  {t.accessPublic}
                </Button>
                <Button
                  variant={accessFilter === "premium" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setAccessFilter("premium")}
                  className="h-7 px-3 gap-1"
                >
                  <Crown className="w-3 h-3" />
                  {t.accessPremium}
                </Button>
              </div>
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
                const displayTitle = language === 'en' && article.title_en ? article.title_en : article.title;
                const displayExcerpt = language === 'en' && article.excerpt_en ? article.excerpt_en : article.excerpt;
                const isPremiumLocked = article.is_premium && !user;
                const isTrending = trendingArticleIds.has(article.id);
                
                return (
                <Link 
                  key={article.id} 
                  to={isPremiumLocked ? "/auth" : `/blog/${article.slug}`}
                  state={isPremiumLocked ? { from: `/blog/${article.slug}` } : undefined}
                >
                  <Card className={`overflow-hidden h-full hover:shadow-lg transition-shadow group ${isPremiumLocked ? 'opacity-90' : ''}`}>
                    <div className="relative h-48 overflow-hidden bg-gradient-to-br from-muted/60 to-muted/40">
                      {coverImage ? (
                        <img
                          src={coverImage}
                          alt={displayTitle}
                          loading="lazy"
                          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${isPremiumLocked ? 'blur-[2px]' : ''}`}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-4xl opacity-50">📝</span>
                        </div>
                      )}
                      <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                        <Badge>
                          {article.category}
                        </Badge>
                        {isTrending && (
                          <Badge className="bg-gradient-to-r from-rose-500 to-orange-500 text-white border-rose-600">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            {t.trendingBadge}
                          </Badge>
                        )}
                        {article.is_premium && (
                          <Badge className="bg-amber-500/90 text-white border-amber-600">
                            <Crown className="w-3 h-3 mr-1" />
                            {t.premiumBadge}
                          </Badge>
                        )}
                      </div>
                      {isPremiumLocked && (
                        <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                          <div className="flex items-center gap-2 bg-background/90 px-4 py-2 rounded-full shadow-lg">
                            <Lock className="w-4 h-4 text-amber-500" />
                            <span className="text-sm font-medium">{t.loginToRead}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-6">
                      <h2 className="text-xl font-serif font-semibold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
                        {displayTitle}
                      </h2>
                      <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                        {displayExcerpt}
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
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {(article.view_count || 0).toLocaleString()}
                          </span>
                        </div>
                        {isPremiumLocked ? (
                          <Lock className="w-4 h-4 text-amber-500" />
                        ) : (
                          <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
                        )}
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
      <GlobalConversionWidgets />
      <BackToTop />
    </div>
  );
};

export default Blog;
