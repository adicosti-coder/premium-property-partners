import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import DOMPurify from "dompurify";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/i18n/LanguageContext";
import { useArticleViewTracking } from "@/hooks/useArticleViewTracking";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BlogComments from "@/components/BlogComments";
import BlogNewsletterCTA from "@/components/BlogNewsletterCTA";
import RelatedArticles from "@/components/RelatedArticles";
import SocialShareButtons from "@/components/blog/SocialShareButtons";
import BlogArticleCTA from "@/components/blog/BlogArticleCTA";
import ArticleTableOfContents from "@/components/blog/ArticleTableOfContents";
import ArticleTLDR from "@/components/blog/ArticleTLDR";
import InternalLinks from "@/components/blog/InternalLinks";
import ArticleFAQ from "@/components/blog/ArticleFAQ";
import SEOHead from "@/components/SEOHead";
import GlobalConversionWidgets from "@/components/GlobalConversionWidgets";
import InvestorGuideButton from "@/components/InvestorGuideButton";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import BackToTop from "@/components/BackToTop";
import { generateArticleSchema, generateBreadcrumbSchema, generateHowToSchema } from "@/utils/schemaGenerators";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, ArrowLeft, User, Tag, Lock, Crown, LogIn, Eye, Trophy, PenLine } from "lucide-react";
import { format } from "date-fns";
import { ro, enUS } from "date-fns/locale";
import { getBlogCoverImage } from "@/utils/blogImageMap";
import { User as SupabaseUser } from "@supabase/supabase-js";

interface BlogArticle {
  id: string;
  slug: string;
  title: string;
  title_en: string | null;
  excerpt: string;
  excerpt_en: string | null;
  content: string;
  content_en: string | null;
  cover_image: string | null;
  category: string;
  tags: string[];
  author_name: string;
  published_at: string | null;
  created_at: string;
  is_premium: boolean;
  view_count: number;
}

const BlogArticlePage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const dateLocale = language === "ro" ? ro : enUS;
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const { data: article, isLoading, error } = useQuery({
    queryKey: ["blog-article", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_articles")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();

      if (error) throw error;
      return data as BlogArticle | null;
    },
  });

  // Track article view (must be before any conditionals)
  useArticleViewTracking(article?.id);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsCheckingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const translations = {
    ro: {
      backToBlog: "Înapoi la Blog",
      notFound: "Articol Negăsit",
      notFoundDescription: "Ne pare rău, acest articol nu există sau nu a fost publicat.",
      goToBlog: "Mergi la Blog",
      minRead: "min citire",
      premiumContent: "Conținut Premium",
      premiumDescription: "Acest articol este rezervat membrilor noștri. Autentifică-te pentru a citi conținutul complet.",
      loginToRead: "Autentifică-te pentru a citi",
      premiumBadge: "Premium",
    },
    en: {
      backToBlog: "Back to Blog",
      notFound: "Article Not Found",
      notFoundDescription: "Sorry, this article doesn't exist or hasn't been published.",
      goToBlog: "Go to Blog",
      minRead: "min read",
      premiumContent: "Premium Content",
      premiumDescription: "This article is reserved for our members. Login to read the full content.",
      loginToRead: "Login to read",
      premiumBadge: "Premium",
    },
  };

  const t = translations[language] || translations.ro;
  const articleUrl = typeof window !== "undefined" ? window.location.href : "";

  // Check if this is a premium article that requires auth
  const isPremiumLocked = article?.is_premium && !user;

  if (isLoading || isCheckingAuth) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-6 max-w-4xl">
            <Skeleton className="h-8 w-32 mb-8" />
            <Skeleton className="h-12 w-full mb-4" />
            <Skeleton className="h-6 w-2/3 mb-8" />
            <Skeleton className="h-96 w-full mb-8" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!article || error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-6 text-center">
            <Tag className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {t.notFound}
            </h1>
            <p className="text-muted-foreground mb-6">
              {t.notFoundDescription}
            </p>
            <Button onClick={() => navigate("/blog")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t.goToBlog}
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const displayTitle = language === 'en' && article.title_en ? article.title_en : article.title;
  const displayExcerpt = language === 'en' && article.excerpt_en ? article.excerpt_en : article.excerpt;
  const displayContent = language === 'en' && article.content_en ? article.content_en : article.content;
  const readingTime = Math.ceil(displayContent.length / 1000);
  const coverImage = getBlogCoverImage(article.slug, article.cover_image);

  // Premium locked state - show teaser
  if (isPremiumLocked) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16">
          <article className="container mx-auto px-6 max-w-4xl">
            <Link
              to="/blog"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t.backToBlog}
            </Link>

            <header className="mb-8">
              <div className="flex gap-2 mb-4">
                <Badge>{article.category}</Badge>
                <Badge className="bg-amber-500/90 text-white border-amber-600">
                  <Crown className="w-3 h-3 mr-1" />
                  {t.premiumBadge}
                </Badge>
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-foreground mb-4">
                {displayTitle}
              </h1>
              <p className="text-lg text-muted-foreground mb-6">
                {displayExcerpt}
              </p>
            </header>

            {coverImage && (
              <div className="relative aspect-video mb-8 rounded-xl overflow-hidden">
                <img
                  src={coverImage}
                  alt={displayTitle}
                  className="w-full h-full object-cover blur-sm"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
              </div>
            )}

            {/* Premium Lock Card */}
            <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-amber-600/10">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <Lock className="w-8 h-8 text-amber-500" />
                </div>
                <h2 className="text-2xl font-serif font-bold text-foreground mb-2">
                  {t.premiumContent}
                </h2>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  {t.premiumDescription}
                </p>
                <Button 
                  size="lg" 
                  onClick={() => navigate("/auth", { state: { from: `/blog/${slug}` } })}
                  className="gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  {t.loginToRead}
                </Button>
              </CardContent>
            </Card>

            <RelatedArticles 
              currentArticleId={article.id}
              category={article.category}
              tags={article.tags}
            />
        </article>
      </main>
      <Footer />
      <GlobalConversionWidgets showExitIntent={false} />
    </div>
  );
  }
  
  // Generate enhanced Schema.org structured data
  const articleSchemaData = generateArticleSchema({
    headline: displayTitle,
    description: displayExcerpt,
    image: coverImage || undefined,
    datePublished: article.published_at || article.created_at,
    dateModified: article.published_at || article.created_at,
    author: article.author_name,
    url: articleUrl,
    category: article.category,
    tags: article.tags,
    wordCount: displayContent.length,
    isAccessibleForFree: !article.is_premium,
  });

  const breadcrumbSchemaData = generateBreadcrumbSchema([
    { name: language === "ro" ? "Acasă" : "Home", url: "https://realtrust.ro" },
    { name: "Blog", url: "https://realtrust.ro/blog" },
    { name: displayTitle, url: articleUrl },
  ]);

  // Add HowTo schema for guide/how-to articles
  const isGuideArticle = article.category?.toLowerCase().includes("ghid") || 
    article.tags?.some(t => t.toLowerCase().includes("ghid") || t.toLowerCase().includes("how-to") || t.toLowerCase().includes("cum să"));
  
  const combinedJsonLd: Record<string, unknown>[] = [articleSchemaData, breadcrumbSchemaData];
  
  if (isGuideArticle) {
    // Extract H2 headings as HowTo steps
    const h2Regex = /<h2[^>]*>(.*?)<\/h2>/gi;
    const steps: { name: string; text: string }[] = [];
    let match;
    while ((match = h2Regex.exec(displayContent)) !== null) {
      const name = match[1].replace(/<[^>]*>/g, '').trim();
      if (name) steps.push({ name, text: name });
    }
    if (steps.length >= 2) {
      combinedJsonLd.push(generateHowToSchema(displayTitle, displayExcerpt, steps));
    }
  }

  const breadcrumbItems = [
    { label: "Blog", href: "/blog" },
    { label: displayTitle }
  ];
  
  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title={displayTitle}
        description={displayExcerpt}
        type="article"
        image={coverImage || undefined}
        jsonLd={combinedJsonLd}
        publishedTime={article.published_at || article.created_at}
        author={article.author_name}
        articleTags={article.tags}
        articleCategory={article.category}
      />
      <Header />

      <main className="pt-24 pb-16">
        <article className="container mx-auto px-6 max-w-4xl">
          {/* Breadcrumb */}
          <PageBreadcrumb items={breadcrumbItems} className="mb-6" />
          
          {/* Back Button */}
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.backToBlog}
          </Link>

          {/* Article Header */}
          <header className="mb-8">
            <Badge className="mb-4">{article.category}</Badge>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-foreground mb-4">
              {displayTitle}
            </h1>
            <p className="text-lg text-muted-foreground mb-6">
              {displayExcerpt}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {article.author_name}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {format(
                  new Date(article.published_at || article.created_at),
                  "d MMMM yyyy",
                  { locale: dateLocale }
                )}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {readingTime} {t.minRead}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {article.view_count.toLocaleString()} {language === "ro" ? "vizualizări" : "views"}
              </span>
            </div>

            {/* Social Share Buttons */}
            <SocialShareButtons 
              url={articleUrl} 
              title={displayTitle} 
              description={displayExcerpt}
            />
          </header>

          {/* Cover Image */}
          {coverImage && (
            <div className="relative aspect-video mb-8 rounded-xl overflow-hidden">
              <img
                src={coverImage}
                alt={displayTitle}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* TL;DR Summary for AI extraction */}
          <div className="article-tldr">
            <ArticleTLDR excerpt={displayExcerpt} readingTime={readingTime} />
          </div>

          {/* Table of Contents */}
          <ArticleTableOfContents htmlContent={displayContent} />

          {/* Article Content - sanitized for XSS protection */}
          <div
            className="prose prose-lg dark:prose-invert max-w-none mb-8"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(displayContent) }}
          />

          {/* Tags and Share */}
          <div className="pt-8 border-t border-border space-y-6">
            {article.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            
            {/* Bottom Social Share */}
            <div className="flex justify-center">
              <SocialShareButtons 
                url={articleUrl} 
                title={displayTitle} 
                description={displayExcerpt}
              />
            </div>
            </div>

            {/* Contextual Internal Links for SEO */}
            <InternalLinks category={article.category} tags={article.tags} />

            {/* Auto-generated FAQ per article */}
            <ArticleFAQ category={article.category} articleTitle={displayTitle} />

          {/* Investor Guide CTA - only for investment-related articles */}
          {(article.category === "Investiții" || article.tags.some(tag => 
            tag.toLowerCase().includes("investiț") || 
            tag.toLowerCase().includes("roi") || 
            tag.toLowerCase().includes("randament")
          )) && (
            <div className="my-12 p-8 bg-gradient-to-br from-primary/5 via-background to-primary/10 rounded-2xl border border-primary/20 text-center">
              <h3 className="text-2xl font-serif font-bold mb-3">
                {language === "ro" ? "Vrei să afli mai multe despre investiții?" : "Want to learn more about investing?"}
              </h3>
              <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                {language === "ro" 
                  ? "Descarcă ghidul nostru complet cu analize de piață și strategii de maximizare a profitului."
                  : "Download our complete guide with market analysis and profit maximization strategies."}
              </p>
              <InvestorGuideButton size="lg" />
            </div>
          )}

          {/* Community Contest Banner */}
          <div className="my-12 p-6 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-rose-500/10 border border-amber-500/20 rounded-xl">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-full">
                  <Trophy className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    {language === "ro" ? "Scrie și câștigă!" : "Write and win!"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {language === "ro"
                      ? "Trimite un articol și poți câștiga o noapte gratuită de cazare."
                      : "Submit an article and you could win a free night stay."}
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" className="shrink-0 border-amber-500/50 hover:bg-amber-500/10">
                <Link to="/comunitate">
                  <PenLine className="w-4 h-4 mr-2" />
                  {language === "ro" ? "Participă la concurs" : "Join the contest"}
                </Link>
              </Button>
            </div>
          </div>

          {/* Related Articles */}
          <RelatedArticles 
            currentArticleId={article.id}
            category={article.category}
            tags={article.tags}
          />

          {/* Newsletter CTA */}
          <BlogNewsletterCTA />

          {/* Dual CTA Sections */}
          <BlogArticleCTA />

          {/* Comments Section */}
          <BlogComments articleId={article.id} />
        </article>
      </main>

      <Footer />
      <GlobalConversionWidgets showExitIntent={false} />
      <BackToTop />
    </div>
  );
};

export default BlogArticlePage;
