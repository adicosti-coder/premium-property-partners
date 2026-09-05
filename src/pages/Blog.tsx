import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/i18n/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import BlogCardSkeleton from "@/components/BlogCardSkeleton";
import { Calendar, Clock, Search, Tag, ArrowRight, ArrowUpDown, Sparkles, Lock, Crown, Eye, TrendingUp, PenLine, Trophy } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination";
import { BLOG_CATEGORIES } from "@/lib/blogCategories";
import { format } from "date-fns";
import { ro, enUS } from "date-fns/locale";
import { getBlogCoverImage } from "@/utils/blogImageMap";
import { User } from "@supabase/supabase-js";
import SEOHead from "@/components/SEOHead";
import { generateBlogCollectionSchema, generateBreadcrumbSchema } from "@/utils/schemaGenerators";
import { REAL_ESTATE_AGENT_SCHEMA } from "@/lib/orgIdentity";
import GlobalConversionWidgets from "@/components/GlobalConversionWidgets";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import BackToTop from "@/components/BackToTop";
import LeadMagnetBanner from "@/components/LeadMagnetBanner";
import InvestorGuideButton from "@/components/InvestorGuideButton";
import PageSummary from "@/components/PageSummary";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useRegisterFAQs } from "@/hooks/useFAQSchema";
import BlogPillarHub from "@/components/blog/BlogPillarHub";

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
  const queryClient = useQueryClient();
  const dateLocale = language === "ro" ? ro : enUS;
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [accessFilter, setAccessFilter] = useState<AccessFilter>("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 9;
  const [user, setUser] = useState<User | null>(null);
  const [isBackgroundTranslating, setIsBackgroundTranslating] = useState(false);

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

  // English display labels for RO category names shown as filter chips
  const categoryLabelsEn: Record<string, string> = {
    "Investiții": "Investments",
    "Taxe & Legislație": "Taxes & Legislation",
    "Ghiduri Oaspeți": "Guest Guides",
    "Cazare Oaspeți": "Guest Stays",
    "Proprietari": "Owners",
    "amenajare": "Interior design",
    "ghiduri": "Guides",
    "analize": "Market analysis",
    "market-insights": "Market insights",
    "Administrare Hotelieră": "Hotel Management",
    "Operațional": "Operations",
    "Revenue Management": "Revenue Management",
    "Mentenanță": "Maintenance",
    "Imobiliare": "Real Estate",
    "Branding": "Branding",
    "Distribuție": "Distribution",
    "sfaturi": "Tips",
    "tehnologie": "Technology",
    "piață": "Market",
  };
  const localizedCategory = (cat: string) =>
    language === "en" ? (categoryLabelsEn[cat] ?? cat) : cat;

  // Auto-translate: when viewing in English and some articles lack title_en/excerpt_en,
  // fire the edge function (best-effort) and refetch on success. Runs at most once per session.
  useEffect(() => {
    if (language !== "en" || !articles || articles.length === 0) return;
    const missing = articles.filter((a) => !a.title_en || !a.excerpt_en);
    if (missing.length === 0) return;
    const flagKey = "blog-en-translated-batch";
    if (typeof window !== "undefined" && sessionStorage.getItem(flagKey)) return;
    if (typeof window !== "undefined") sessionStorage.setItem(flagKey, "1");
    setIsBackgroundTranslating(true);
    supabase.functions
      .invoke("translate-blog-articles", { body: { limit: Math.min(missing.length, 20) } })
      .then((res) => {
        if (!res.error) {
          queryClient.invalidateQueries({ queryKey: ["blog-articles"] });
        }
      })
      .catch(() => {
        // silent — best-effort
      })
      .finally(() => {
        setIsBackgroundTranslating(false);
      });
  }, [language, articles, queryClient]);


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

  useEffect(() => { setPage(1); }, [searchQuery, selectedCategory, accessFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredArticles.length / PAGE_SIZE));
  const pagedArticles = useMemo(
    () => filteredArticles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredArticles, page]
  );

  const translations = {
    ro: {
      title: "Blog & Ghiduri",
      subtitle: "Analize de piață, studii de caz și ghiduri pentru proprietari, investitori și oaspeți Timișoara.",
      search: "Caută în articole...",
      allCategories: "Toate categoriile",
      noArticles: "Niciun articol nu corespunde filtrelor",
      noArticlesDescription: "Încearcă să ajustezi termenii de căutare sau filtrele.",
      readMore: "Citește articolul",
      minRead: "min de lectură",
      sortBy: "Sortează după",
      newest: "Cele mai recente",
      oldest: "Cele mai vechi",
      titleSort: "Alfabetic",
      popular: "Cele mai citite",
      communityTitle: "Contribuie cu un articol",
      communityDesc: "Trimite-ne un articol relevant pentru piața din Timișoara. Cele mai bune materiale sunt răsplătite cu o noapte de cazare.",
      communityBtn: "Trimite un articol",
      promoTitle: "Rezervare directă: 5% reducere",
      promoDescription: "Folosește codul DIRECT5 pentru o reducere de 5% la rezervările directe.",
      promoButton: "Vezi avantajele rezervării directe",
      premiumBadge: "Premium",
      trendingBadge: "Citit acum",
      loginToRead: "Autentifică-te pentru a citi",
      accessAll: "Toate",
      accessPublic: "Publice",
      accessPremium: "Premium",
    },
    en: {
      title: "Blog & Guides",
      subtitle: "Market analysis, case studies and guides for owners, investors and guests in Timișoara.",
      search: "Search articles...",
      allCategories: "All categories",
      noArticles: "No articles match your filters",
      noArticlesDescription: "Try adjusting your search terms or filters.",
      readMore: "Read the article",
      minRead: "min read",
      sortBy: "Sort by",
      newest: "Most recent",
      oldest: "Oldest",
      titleSort: "Alphabetical",
      popular: "Most read",
      communityTitle: "Contribute an article",
      communityDesc: "Send us an article relevant to the Timișoara market. The best contributions are rewarded with a complimentary night's stay.",
      communityBtn: "Submit an article",
      promoTitle: "Book direct: 5% discount",
      promoDescription: "Use code DIRECT5 for a 5% discount on direct bookings.",
      promoButton: "See direct booking benefits",
      premiumBadge: "Premium",
      trendingBadge: "Trending",
      loginToRead: "Log in to read",
      accessAll: "All",
      accessPublic: "Public",
      accessPremium: "Premium",
    },
  };

  const t = translations[language] || translations.ro;

  const seoContent = {
    ro: {
      title: "Ghid Imobiliar Timișoara: Investiții & Regim Hotelier",
      description: "Ghidul pieței imobiliare din Timișoara: analize de randament, strategii de investiții și sfaturi pentru vânzări sau regim hotelier."
    },
    en: {
      title: "Timișoara Real Estate Guide: Invest & Short-Term Rent",
      description: "Timișoara real estate market guide: yield analysis, investment strategies and practical tips for sales or short-term rentals."

    }
  };

  const seo = seoContent[language as keyof typeof seoContent] || seoContent.ro;

  const blogFaqItems = [
    {
      question: "Care sunt prețurile imobiliare în Timișoara în 2026?",
      answer: "Prețurile medii pe metru pătrat în Timișoara variază între 1.300 €/mp (Mehala, Ronaț) și 2.600 €/mp (Centru, ISHO). Dumbrăvița și Giroc se situează la 1.800-2.100 €/mp, cu apreciere anuală de 5-8%.",
    },
    {
      question: "Cum a evoluat piața imobiliară Timișoara în ultimii ani?",
      answer: "Piața imobiliară Timișoara a crescut cu 35-50% în 2020-2026, susținută de dezvoltarea zonelor metropolitane (Giroc, Dumbrăvița, Chișoda), expansiunea hub-urilor industriale (Continental, Hella, Flex) și cererea pentru regim hotelier post-pandemic.",
    },
    {
      question: "Care este randamentul chiriei în Timișoara — clasic vs regim hotelier?",
      answer: "Chirie clasică: 4-6% randament brut. Regim hotelier administrat profesional (RealTrust): 9.4% net verificat, multiplicator 1.6-2.5x. Cele mai performante zone: ISHO, Centru, Complex Studențesc, Iulius Town.",
    },
    {
      question: "Sunt apartamente disponibile lângă Continental, Hella sau Spitalul Premiere?",
      answer: "Da. Pentru angajații Continental și hub-urile industriale (zona Aradului, Calea Torontalului) recomandăm apartamente în Aradului și Lipovei. Pentru proximitate Spitalul Premiere (Calea Torontalului) — zonele Aradului și Mehala. Pentru zone rezidențiale liniștite cu acces la natură — Pădurea Verde și Ghiroda.",
    },
  ];

  useRegisterFAQs("blog-realtrust", blogFaqItems);

  const breadcrumbItems = [
    { label: "Blog" }
  ];

  const blogSchemas = useMemo(() => {
    const schemas: Record<string, unknown>[] = [
      generateBreadcrumbSchema([
        { name: language === "ro" ? "Acasă" : "Home", url: "https://realtrust.ro" },
        { name: "Blog", url: "https://realtrust.ro/blog" },
      ]),
      // Blog schema
      {
        "@context": "https://schema.org",
        "@type": "Blog",
        "name": "Blog RealTrust — Investiții Imobiliare Timișoara",
        "url": "https://realtrust.ro/blog",
        "publisher": {
          "@type": "Organization",
          "name": "RealTrust"
        }
      },
      // WebPage schema (pillar page semantics)
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": "https://realtrust.ro/blog#webpage",
        "url": "https://realtrust.ro/blog",
        "name": "Ghid Imobiliar Timișoara — Investiții, Vânzări & Regim Hotelier",
        "description": "Hub editorial RealTrust: analiza pieței imobiliare Timișoara, evaluare apartament, randament chirie clasic vs regim hotelier și ghiduri pe cartiere.",
        "inLanguage": language === "ro" ? "ro-RO" : "en-US",
        "primaryImageOfPage": {
          "@type": "ImageObject",
          "url": "https://realtrust.ro/images/hero-optimized-1920w.webp"
        },
        "about": [
          { "@type": "Thing", "name": "Investiții imobiliare Timișoara" },
          { "@type": "Thing", "name": "Regim hotelier Timișoara" },
          { "@type": "Thing", "name": "Evaluare apartament Timișoara" },
          { "@type": "Thing", "name": "Randament chirie Timișoara" }
        ]
      },
      // RealEstateAgent schema — single source of truth (orgIdentity)
      REAL_ESTATE_AGENT_SCHEMA,
    ];
    if (articles && articles.length > 0) {
      schemas.push(generateBlogCollectionSchema(articles));
    }
    return schemas;
  }, [articles, language]);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title={seo.title}
        description={seo.description}
        url="https://realtrust.ro/blog"
        jsonLd={blogSchemas}
      />
      <Header />
      <PageSummary
        summaryRo="Blog RealTrust — articole despre investiții imobiliare, administrare în regim hotelier, fiscalitate, prețuri dinamice și ghiduri turistice Timișoara. Sfaturi practice pentru proprietari și investitori."
        summaryEn="RealTrust Blog — articles about real estate investment, short-term rental management, taxation, dynamic pricing and Timișoara tourist guides. Practical tips for owners and investors."
      />

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

          {/* Pillar intro — investment hub */}
          {language === "ro" && (
            <section className="mb-10 rounded-2xl border border-border bg-card/60 p-6 md:p-8">
              <h2 className="text-2xl font-serif font-semibold text-foreground mb-3">
                Hub investiții imobiliare Timișoara
              </h2>
              <p className="text-muted-foreground mb-4">
                Articolele noastre acoperă <strong>prețurile imobiliare Timișoara</strong> pe cartiere, <strong>evoluția pieței imobiliare Timișoara</strong> și <strong>randamentul chiriei</strong> — clasic vs regim hotelier. Ghiduri practice pentru investitori, proprietari și angajați ai hub-urilor business: <Link to="/imobiliare-timisoara/aradului" className="text-primary hover:underline">apartamente lângă Continental Timișoara</Link>, zona <strong>Pădurea Verde</strong>, cazare lângă <strong>Spitalul Premiere</strong> și Spitalul Județean.
              </p>
              <div className="flex flex-wrap gap-2 text-sm">
                <Link to="/calculator-roi" className="rounded-full border border-border bg-background px-3 py-1.5 hover:border-primary/40 hover:text-primary transition-colors">
                  Calculator ROI
                </Link>
                <Link to="/piata-imobiliara-timisoara" className="rounded-full border border-border bg-background px-3 py-1.5 hover:border-primary/40 hover:text-primary transition-colors">
                  Prețuri pe cartiere
                </Link>
                <Link to="/cartiere" className="rounded-full border border-border bg-background px-3 py-1.5 hover:border-primary/40 hover:text-primary transition-colors">
                  Apartamente pe zone
                </Link>
                <Link to="/catalog-investitii" className="rounded-full border border-border bg-background px-3 py-1.5 hover:border-primary/40 hover:text-primary transition-colors">
                  Catalog investiții
                </Link>
              </div>
            </section>
          )}

          {/* Pillar Hub — ToC + structured H2/H3 sections covering missing keywords */}
          {language === "ro" && <BlogPillarHub />}

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
                  {localizedCategory(cat)}
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

          {/* Subtle notice while background translation is running */}
          {isBackgroundTranslating && (
            <div
              role="status"
              aria-live="polite"
              className="mb-4 flex items-center gap-2 text-xs text-muted-foreground animate-pulse"
            >
              <span className="inline-block w-2 h-2 rounded-full bg-primary/60" />
              {language === "en"
                ? "Translating articles to English…"
                : "Se traduc articolele în engleză…"}
            </div>
          )}

          {/* Articles Grid */}
          {isLoading || isBackgroundTranslating ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <BlogCardSkeleton key={i} />
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
              {pagedArticles.map((article) => {
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
                          decoding="async"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
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
                          <Badge className="bg-amber-500/90 text-white border-amber-600" title={language === 'ro' ? 'Conținut exclusiv pentru membri autentificați' : 'Exclusive content for authenticated members'}>
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

          {!isLoading && totalPages > 1 && (
            <Pagination className="mt-10">
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

          {/* Category hubs */}
          <section className="mt-16">
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-4 text-center">
              Explorează pe categorie
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {BLOG_CATEGORIES.map((c) => (
                <Link
                  key={c.slug}
                  to={`/blog/categorie/${c.slug}`}
                  className="rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md transition-all"
                >
                  <div className="font-serif font-semibold text-foreground mb-1">{c.name}</div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{c.intro}</p>
                </Link>
              ))}
            </div>
          </section>

          {/* Investor Guide CTA for Investment Articles */}
          <div className="mt-12 text-center">
            <InvestorGuideButton size="lg" />
          </div>

          {/* FAQ — pillar topic */}
          {language === "ro" && (
            <section className="mt-16">
              <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">
                Întrebări frecvente — investiții imobiliare Timișoara
              </h2>
              <Accordion type="single" collapsible className="rounded-2xl border border-border bg-card px-6">
                {blogFaqItems.map((item, idx) => (
                  <AccordionItem key={idx} value={`blog-faq-${idx}`} className="last:border-b-0">
                    <AccordionTrigger className="text-left text-foreground">{item.question}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">{item.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          )}

          {/* Lead Magnet Banner */}
          <div className="mt-16">
            <LeadMagnetBanner variant="hero" />
          </div>
        </div>
      </main>

      <Footer />
      <GlobalConversionWidgets />
      <BackToTop />
    </div>
  );
};

export default Blog;
