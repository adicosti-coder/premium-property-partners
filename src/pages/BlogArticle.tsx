import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BlogComments from "@/components/BlogComments";
import BlogNewsletterCTA from "@/components/BlogNewsletterCTA";
import RelatedArticles from "@/components/RelatedArticles";
import AccessibilityPanel from "@/components/AccessibilityPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, ArrowLeft, User, Tag, Share2 } from "lucide-react";
import { format } from "date-fns";
import { ro, enUS } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { getBlogCoverImage } from "@/utils/blogImageMap";

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
}

const BlogArticle = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const dateLocale = language === "ro" ? ro : enUS;

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

  const translations = {
    ro: {
      backToBlog: "Înapoi la Blog",
      notFound: "Articol Negăsit",
      notFoundDescription: "Ne pare rău, acest articol nu există sau nu a fost publicat.",
      goToBlog: "Mergi la Blog",
      minRead: "min citire",
      share: "Distribuie",
      linkCopied: "Link copiat în clipboard!",
    },
    en: {
      backToBlog: "Back to Blog",
      notFound: "Article Not Found",
      notFoundDescription: "Sorry, this article doesn't exist or hasn't been published.",
      goToBlog: "Go to Blog",
      minRead: "min read",
      share: "Share",
      linkCopied: "Link copied to clipboard!",
    },
  };

  const t = translations[language] || translations.ro;

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({ title: t.linkCopied });
    } catch {
      console.error("Failed to copy link");
    }
  };

  if (isLoading) {
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
  
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-16">
        <article className="container mx-auto px-6 max-w-4xl">
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

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
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
              <Button variant="ghost" size="sm" onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-1" />
                {t.share}
              </Button>
            </div>
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

          {/* Article Content */}
          <div
            className="prose prose-lg dark:prose-invert max-w-none mb-8"
            dangerouslySetInnerHTML={{ __html: displayContent }}
          />

          {/* Tags */}
          {article.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-8 border-t border-border">
              {article.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Related Articles */}
          <RelatedArticles 
            currentArticleId={article.id}
            category={article.category}
            tags={article.tags}
          />

          {/* Newsletter CTA */}
          <BlogNewsletterCTA />

          {/* CTA Section */}
          <div className="p-6 bg-primary/5 border border-primary/20 rounded-xl text-center">
            <p className="text-foreground">
              {language === "ro" 
                ? "Vrei să fii aproape de locațiile importante din Timișoara? Vezi apartamentele noastre premium aici: "
                : "Want to be close to important locations in Timișoara? See our premium apartments here: "}
              <Link 
                to="/guests" 
                className="text-primary font-semibold hover:underline"
              >
                realtrust.ro
              </Link>
            </p>
          </div>

          {/* Comments Section */}
          <BlogComments articleId={article.id} />
        </article>
      </main>

      <Footer />
      <AccessibilityPanel />
    </div>
  );
};

export default BlogArticle;
