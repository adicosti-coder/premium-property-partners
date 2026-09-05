import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCtaAnalytics } from "@/hooks/useCtaAnalytics";
import { useState, useEffect, useMemo, useRef, lazy, Suspense } from "react";
import DOMPurify from "dompurify";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/i18n/LanguageContext";
import { useArticleViewTracking } from "@/hooks/useArticleViewTracking";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";

const BlogComments = lazy(() => import("@/components/BlogComments"));
const BlogNewsletterCTA = lazy(() => import("@/components/BlogNewsletterCTA"));
const RelatedArticles = lazy(() => import("@/components/RelatedArticles"));
const SocialShareButtons = lazy(() => import("@/components/blog/SocialShareButtons"));
const BlogArticleCTA = lazy(() => import("@/components/blog/BlogArticleCTA"));
const ArticleTableOfContents = lazy(() => import("@/components/blog/ArticleTableOfContents"));
const ArticleTLDR = lazy(() => import("@/components/blog/ArticleTLDR"));
const InternalLinks = lazy(() => import("@/components/blog/InternalLinks"));
const ArticleFAQ = lazy(() => import("@/components/blog/ArticleFAQ"));
const ExpertSignature = lazy(() => import("@/components/ExpertSignature"));
const GlobalConversionWidgets = lazy(() => import("@/components/GlobalConversionWidgets"));
import { RoiByNeighborhoodChart, MonthlyYieldChart, PriceAppreciationChart } from "@/components/blog/TimisoaraInvestmentCharts";
const RestaurantGuideMap = lazy(() => import("@/components/blog/RestaurantGuideMap"));
import InvestorGuideButton from "@/components/InvestorGuideButton";
const ReadingProgressBar = lazy(() => import("@/components/blog/ReadingProgressBar"));
const FloatingShareRail = lazy(() => import("@/components/blog/FloatingShareRail"));
const PdfLeadMagnetButton = lazy(() => import("@/components/blog/PdfLeadMagnetButton"));
const InvestmentGuideLeadModal = lazy(() => import("@/components/blog/InvestmentGuideLeadModal"));
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
import { getBlogCoverImage, FALLBACK_BLOG_IMAGE, handleBlogImageError } from "@/utils/blogImageMap";
import { useRegisterFAQs } from "@/hooks/useFAQSchema";
import { slugifyLocation } from "@/lib/blogLocations";
import { MapPin } from "lucide-react";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { markInvestmentArticleVisit, INVESTMENT_ARTICLE_SLUG } from "@/lib/investmentReferralTracking";
import {
  injectUtmParams,
  getOrAssignCtaVariant,
  type BlogCtaTarget,
} from "@/lib/blogCtaUtm";

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
  const consolidatedTarget = resolveConsolidatedArticle(slug);
  const { language } = useLanguage();
  const dateLocale = language === "ro" ? ro : enUS;
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const queryClient = useQueryClient();
  const { trackCta } = useCtaAnalytics();

  const prefetchHub = (locSlug: string) => {
    queryClient.prefetchQuery({
      queryKey: ["blog-location", locSlug],
      queryFn: async () => {
        const { data } = await supabase
          .from("blog_articles")
          .select(
            "id, slug, title, excerpt, cover_image, main_image_url, category, geo_location, published_at, created_at, view_count"
          )
          .eq("is_published", true)
          .not("geo_location", "is", null)
          .order("published_at", { ascending: false });
        return (data ?? []).filter(
          (a: { geo_location: string | null }) =>
            a.geo_location && slugifyLocation(a.geo_location) === locSlug
        );
      },
      staleTime: 5 * 60 * 1000,
    });
  };

  const hubClickDebounceRef = useRef<Map<string, number>>(new Map());
  const trackHubClick = (loc: string, source: "inline" | "card") => {
    const locSlug = slugifyLocation(loc);
    const key = `${locSlug}|${source}`;
    const now = Date.now();
    const last = hubClickDebounceRef.current.get(key) ?? 0;
    // Debounce: ignore repeat clicks within 1.5s for same location+source
    if (now - last < 1500) return;
    hubClickDebounceRef.current.set(key, now);

    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", "blog_location_hub_click", {
        location: loc,
        location_slug: locSlug,
        source,
        article_slug: slug,
      });
    }
    void trackCta({
      ctaType: "form_submit",
      metadata: {
        event: "blog_location_hub_click",
        location: loc,
        location_slug: locSlug,
        source,
        article_slug: slug,
      },
    });
  };


  const { data: article, isLoading, error } = useQuery({
    queryKey: ["blog-article", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_articles")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();

      if (error) {
        // Report 4xx-style access failures (permission denied, JWT expired, RLS)
        // so a regression in Data-API grants shows up in monitoring instead of a
        // silent blank article page. `reportError` returns a Correlation ID we
        // surface in the UI so users can quote it in support tickets.
        const msg = (error as { message?: string }).message ?? "";
        const code = (error as { code?: string }).code ?? "";
        const isAccessDenied =
          /permission denied|JWT|401|403|not authorized/i.test(msg) ||
          code === "42501" ||
          code === "PGRST301";
        const { reportError } = await import("@/lib/errorReporting");
        const correlationId = reportError(error, {
          scope: "blog_article_fetch",
          meta: { slug, code, isAccessDenied },
        });
        const err = new Error(msg || "Failed to load article") as Error & {
          isAccessDenied?: boolean;
          correlationId?: string;
        };
        err.isAccessDenied = isAccessDenied;
        err.correlationId = correlationId;
        throw err;
      }
      return data as BlogArticle | null;
    },
    retry: (failureCount, err) => {
      // Do not retry on access-denied — surface the error UI immediately.
      if ((err as { isAccessDenied?: boolean })?.isAccessDenied) return false;
      return failureCount < 2;
    },
  });

  // Track article view (must be before any conditionals)
  useArticleViewTracking(article?.id);

  // Tag the visitor session if they're reading the pillar investment article
  // so that any subsequent contact form carries `provenienta: articol_investitii_2026`.
  useEffect(() => {
    if (article?.slug === INVESTMENT_ARTICLE_SLUG) {
      markInvestmentArticleVisit();
    }
  }, [article?.slug]);

  // Conversion tracking + UTM injection + CTA A/B variants
  // for data-cta-blog="evaluare-gratuita|contact" anchors inside article body.
  useEffect(() => {
    if (!article?.id) return;

    // Re-run rewrite after the sanitized HTML mounts. A short rAF chain
    // is enough because content is set synchronously via dangerouslySetInnerHTML.
    let cancelled = false;
    const applyRewrite = () => {
      if (cancelled) return;
      const root = document.querySelector('[data-blog-content-root="1"]');
      if (!root) return;
      const anchors = root.querySelectorAll<HTMLAnchorElement>("a[data-cta-blog]");
      anchors.forEach((a) => {
        if (a.dataset.ctaRewritten === "1") return;
        const target = (a.getAttribute("data-cta-blog") || "") as BlogCtaTarget;
        if (target !== "evaluare-gratuita" && target !== "contact") return;
        const variant = getOrAssignCtaVariant(target);
        // Replace anchor text with assigned A/B variant (only if non-empty)
        if (variant.label) a.textContent = variant.label;
        // Inject UTM parameters
        const newHref = injectUtmParams(a.getAttribute("href") || `/${target}`, {
          target,
          slug: article.slug,
          category: article.category,
          variantId: variant.id,
        });
        a.setAttribute("href", newHref);
        a.dataset.ctaVariant = variant.id;
        a.dataset.ctaRewritten = "1";
      });
    };
    // run a couple of times to catch late DOM commits, then log impressions
    const logImpressions = () => {
      const root = document.querySelector('[data-blog-content-root="1"]');
      if (!root) return;
      const seenKey = `blog_cta_imp_${article.slug}`;
      let seen: Record<string, number> = {};
      try { seen = JSON.parse(sessionStorage.getItem(seenKey) || '{}'); } catch { /* ignore */ }
      const anchors = root.querySelectorAll<HTMLAnchorElement>('a[data-cta-blog][data-cta-rewritten="1"]');
      anchors.forEach((a) => {
        const target = a.getAttribute('data-cta-blog') || '';
        const variantId = a.dataset.ctaVariant || 'unassigned';
        const key = `${target}::${variantId}`;
        if (seen[key]) return;
        seen[key] = Date.now();
        supabase.from('cta_analytics').insert({
          cta_type: 'form_submit',
          page_path: typeof window !== 'undefined' ? window.location.pathname : '',
          metadata: {
            source: 'blog_cta_impression',
            cta_target: target,
            cta_variant_id: variantId,
            article_slug: article.slug,
            article_title: article.title,
            article_category: article.category,
          },
        }).then(() => undefined, () => undefined);
      });
      try { sessionStorage.setItem(seenKey, JSON.stringify(seen)); } catch { /* ignore */ }
    };
    const applyImageFallback = () => {
      const root = document.querySelector('[data-blog-content-root="1"]');
      if (!root) return;
      root.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
        if (img.dataset.fallbackBound === '1') return;
        img.dataset.fallbackBound = '1';
        img.addEventListener('error', () => {
          if (img.dataset.fallbackApplied === '1') return;
          img.dataset.fallbackApplied = '1';
          img.src = FALLBACK_BLOG_IMAGE;
        });
      });
    };
    requestAnimationFrame(() => { applyRewrite(); logImpressions(); applyImageFallback(); });
    const t = window.setTimeout(() => { applyRewrite(); logImpressions(); applyImageFallback(); }, 400);

    // Debounce: dedupe identical clicks fired within 1500ms (double-tap, accidental re-click)
    const recentClicks = new Map<string, number>();
    const DEBOUNCE_MS = 1500;

    const handler = (e: MouseEvent) => {
      const target = (e.target as HTMLElement | null)?.closest?.('a[data-cta-blog]') as HTMLAnchorElement | null;
      if (!target) return;
      const ctaTarget = target.getAttribute('data-cta-blog') || 'unknown';
      const ctaContext = target.getAttribute('data-cta-context') || article.category || '';
      const ctaVariantId = target.dataset.ctaVariant || 'unassigned';
      const anchorText = (target.textContent || '').trim().slice(0, 120);
      const params = {
        cta_target: ctaTarget,
        cta_context: ctaContext,
        cta_variant_id: ctaVariantId,
        article_slug: article.slug,
        article_title: article.title,
        article_category: article.category,
        anchor_text: anchorText,
        page_path: typeof window !== 'undefined' ? window.location.pathname : '',
        href: target.getAttribute('href') || '',
      };
      const dedupKey = `${ctaTarget}::${ctaVariantId}::${article.slug}`;
      const now = Date.now();
      const last = recentClicks.get(dedupKey) || 0;
      if (now - last < DEBOUNCE_MS) {
        return; // debounce duplicate fire
      }
      recentClicks.set(dedupKey, now);

      try {
        const consent = typeof window !== 'undefined' ? window.localStorage.getItem('cookie_consent_v2') : null;
        const parsedConsent = consent ? JSON.parse(consent) : null;
        const hasConsent = parsedConsent === 'all' || parsedConsent === 'analytics_only';
        if (hasConsent && typeof window !== 'undefined' && typeof window.gtag === 'function') {
          window.gtag('event', 'cta_blog_click', params);
          window.gtag('event', 'generate_lead', { ...params, lead_source: 'blog_cta' });
        }
      } catch { /* ignore */ }
      supabase.from('cta_analytics').insert({
        cta_type: 'form_submit',
        page_path: typeof window !== 'undefined' ? window.location.pathname : '',
        metadata: { source: 'blog_cta_click', ...params },
      }).then(() => undefined, () => undefined);
    };
    document.addEventListener('click', handler);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
      document.removeEventListener('click', handler);
    };
  }, [article?.id, article?.slug, article?.title, article?.category]);

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
      accessDeniedTitle: "Articol indisponibil momentan",
      accessDeniedDescription:
        "Nu am putut încărca acest articol din cauza unei erori de acces. Reîncearcă sau revino la lista completă de articole.",
      retry: "Reîncearcă",
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
      accessDeniedTitle: "Article temporarily unavailable",
      accessDeniedDescription:
        "We couldn't load this article due to an access error. Please retry or head back to the full blog.",
      retry: "Retry",
    },
  };

  const t = translations[language] || translations.ro;
  const articleUrl = typeof window !== "undefined" ? window.location.href : "";
  const displayTitle = article ? (language === 'en' && article.title_en ? article.title_en : article.title) : "";
  const displayExcerpt = article ? (language === 'en' && article.excerpt_en ? article.excerpt_en : article.excerpt) : "";
  const rawContent = article ? (language === 'en' && article.content_en ? article.content_en : article.content) : "";
  // Enhance internal anchors: ensure title attr (SEO/a11y) + force same-page nav for /internal links.
  // This hook must run before any early return; otherwise articles crash after the loading state.
  const displayContent = useMemo(() => {
    if (!rawContent) return "";
    let html = rawContent.replace(/<a\s+([^>]*?)>([\s\S]*?)<\/a>/gi, (match, attrs, inner) => {
      const hrefMatch = attrs.match(/href=["']([^"']+)["']/i);
      const href = hrefMatch?.[1] ?? "";
      const isInternal = href.startsWith("/") || href.startsWith("#") || href.includes("realtrust.ro");
      let newAttrs = attrs;
      // Strip target=_blank for internal links so the user keeps the navigation flow
      if (isInternal) {
        newAttrs = newAttrs.replace(/\s*target=["'][^"']*["']/gi, "").replace(/\s*rel=["'][^"']*["']/gi, "");
      }
      // Add title attribute if missing — use link text content
      if (!/\stitle=/i.test(newAttrs)) {
        const plainText = inner.replace(/<[^>]+>/g, "").replace(/"/g, "&quot;").trim().slice(0, 120);
        if (plainText) newAttrs += ` title="${plainText}"`;
      }
      return `<a ${newAttrs.trim()}>${inner}</a>`;
    });
    // Core Web Vitals + a11y: force lazy loading, async decoding, and inject
    // a descriptive alt on every <img> that lacks one (or has an empty alt).
    // Alt = "{articleTitle} — imagine {index}" keeps images context-linked
    // to the article and satisfies WCAG 1.1.1 / axe image-alt automatically.
    let imgIndex = 0;
    html = html.replace(/<img\b([^>]*)>/gi, (match, attrs) => {
      let a = attrs as string;
      if (!/\sloading=/i.test(a)) a += ' loading="lazy"';
      if (!/\sdecoding=/i.test(a)) a += ' decoding="async"';
      imgIndex += 1;
      const altMatch = a.match(/\salt=(["'])(.*?)\1/i);
      const hasMeaningfulAlt = altMatch && altMatch[2].trim().length > 0;
      if (!hasMeaningfulAlt) {
        const safeTitle = displayTitle.replace(/"/g, "&quot;").slice(0, 140);
        const generated = ` alt="${safeTitle} — imagine ${imgIndex}"`;
        if (altMatch) {
          a = a.replace(/\salt=(["']).*?\1/i, generated);
        } else {
          a += generated;
        }
      }
      return `<img${a}>`;
    });
    return html;
  }, [rawContent, displayTitle]);
  const readingTime = Math.max(1, Math.ceil(displayContent.length / 1000));
  const coverImage = article ? getBlogCoverImage(article.slug, article.cover_image) : null;

  // Auto-extract Q&A pairs from article body — any <h2>/<h3>/<h4> ending
  // with "?" becomes a Question, with the following <p>/<li> block as the
  // Answer. Registered items enrich the centralized FAQPage JSON-LD so
  // legislative/administrative articles earn Rich Snippets automatically.
  const extractedFaqs = useMemo(() => {
    if (!displayContent) return [] as { question: string; answer: string }[];
    const stripTags = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const out: { question: string; answer: string }[] = [];
    const regex = /<(h[234])[^>]*>([\s\S]*?)<\/\1>([\s\S]*?)(?=<h[234]\b|$)/gi;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(displayContent)) !== null) {
      const question = stripTags(m[2]);
      if (!question.endsWith("?") || question.length < 8 || question.length > 300) continue;
      const answerRaw = m[3] || "";
      const firstBlock = answerRaw.match(/<(p|ul|ol)[^>]*>[\s\S]*?<\/\1>/i);
      const answer = stripTags(firstBlock ? firstBlock[0] : answerRaw).slice(0, 800);
      if (answer.length < 20) continue;
      out.push({ question, answer });
      if (out.length >= 12) break;
    }
    return out;
  }, [displayContent]);
  useRegisterFAQs(
    article ? `blog-article-${article.slug}` : "blog-article-empty",
    extractedFaqs
  );

  // Check if this is a premium article that requires auth
  const isPremiumLocked = article?.is_premium && !user;

  // Distinguish access-denied (401/403/RLS) from plain "not found" so the
  // user gets a clear, actionable screen instead of a generic empty state.
  const accessDenied = (error as { isAccessDenied?: boolean } | null)?.isAccessDenied === true;
  const correlationId = (error as { correlationId?: string } | null)?.correlationId;

  // Fire an anonymous analytics event (no PII) whenever a public 4xx screen
  // appears, so we can correlate technical errors with conversion impact.
  useEffect(() => {
    if (!accessDenied) return;
    if (typeof window === "undefined" || typeof window.gtag !== "function") return;
    window.gtag("event", "public_page_error", {
      error_scope: "blog_article_fetch",
      error_kind: "access_denied",
      slug: slug ?? "",
      correlation_id: correlationId ?? "",
    });
  }, [accessDenied, correlationId, slug]);

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

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-6 text-center max-w-xl">
            <Lock className="w-16 h-16 text-muted-foreground/40 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {t.accessDeniedTitle}
            </h1>
            <p className="text-muted-foreground mb-6">
              {t.accessDeniedDescription}
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Button variant="outline" onClick={() => window.location.reload()}>
                {t.retry}
              </Button>
              <Button onClick={() => navigate("/blog")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t.goToBlog}
              </Button>
            </div>
            {correlationId && (
              <p className="mt-6 text-xs text-muted-foreground/70 font-mono">
                {language === "en" ? "Reference code:" : "Cod referință:"} {correlationId}
              </p>
            )}
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
                  loading="lazy"
                  decoding="async"
                  sizes="(max-width: 768px) 100vw, 800px"
                  className="w-full h-full object-cover blur-sm"
                  onError={handleBlogImageError}
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

            <Suspense fallback={null}>
              <RelatedArticles 
                currentArticleId={article.id}
                category={article.category}
                tags={article.tags}
              />
            </Suspense>
        </article>
      </main>
      <Footer />
      <GlobalConversionWidgets showExitIntent={false} />
    </div>
  );
  }
  
  // SEO-dedicated overrides (DB fields), with safe fallbacks
  const seoTitle = (article as any).meta_title?.trim() || displayTitle;
  const seoDescription = (article as any).meta_description?.trim() || displayExcerpt;
  const seoImage = (article as any).main_image_url?.trim() || coverImage || undefined;
  const geoLocation: string | undefined = (article as any).geo_location?.trim() || undefined;

  // BlogPosting schema — author normalised to canonical brand persona
  // "Adrian Costi" so Google surfaces a single, consistent E-E-A-T entity
  // regardless of what author_name is stored per row.
  const canonicalAuthor = "Adrian Costi";
  const articleSchemaData = generateArticleSchema({
    headline: seoTitle,
    description: seoDescription,
    image: seoImage,
    datePublished: article.published_at || article.created_at,
    dateModified: article.published_at || article.created_at,
    author: canonicalAuthor,
    url: articleUrl,
    category: article.category,
    tags: article.tags,
    wordCount: displayContent.length,
    isAccessibleForFree: !article.is_premium,
  });
  // Language-aware inLanguage tag so RO/EN variants are distinguishable
  // to crawlers even though they share the canonical URL.
  (articleSchemaData as Record<string, unknown>).inLanguage =
    language === "en" ? "en-US" : "ro-RO";

  // Expand `image` into a full ImageObject (url + dimensions + caption) so
  // Google Rich Results doesn't warn about missing image metadata in the
  // BlogPosting structured data.
  if (seoImage) {
    (articleSchemaData as Record<string, unknown>).image = {
      "@type": "ImageObject",
      url: seoImage,
      contentUrl: seoImage,
      width: 1200,
      height: 630,
      caption: displayTitle,
    };
  }

  // Inject GEO targeting into the BlogPosting schema
  if (geoLocation) {
    (articleSchemaData as Record<string, unknown>).contentLocation = {
      "@type": "Place",
      name: geoLocation,
    };
    (articleSchemaData as Record<string, unknown>).spatialCoverage = {
      "@type": "Place",
      name: geoLocation,
    };
  }

  // BreadcrumbList: use the clean canonical article URL (no utm_*, no ?lang=)
  // so Google indexes a single, stable breadcrumb per article for both RO and EN.
  const cleanArticleUrl = `https://realtrust.ro/blog/${article.slug}`;
  const breadcrumbSchemaData = generateBreadcrumbSchema([
    { name: language === "en" ? "Home" : "Acasă", url: "https://realtrust.ro" },
    { name: language === "en" ? "Blog" : "Blog", url: "https://realtrust.ro/blog" },
    { name: displayTitle, url: cleanArticleUrl },
  ]);

  // Add HowTo schema for guide/how-to articles
  const isGuideArticle = article.category?.toLowerCase().includes("ghid") || 
    article.tags?.some(t => t.toLowerCase().includes("ghid") || t.toLowerCase().includes("how-to") || t.toLowerCase().includes("cum să"));
  
  const combinedJsonLd: Record<string, unknown>[] = [articleSchemaData, breadcrumbSchemaData];
  
  if (isGuideArticle) {
    const h2Regex = /<h2[^>]*>(.*?)<\/h2>/gi;
    const steps: { name: string; text: string }[] = [];
    let match;
    while ((match = h2Regex.exec(displayContent)) !== null) {
      const stepName = match[1].replace(/<[^>]+>/g, "").trim();
      if (stepName) steps.push({ name: stepName, text: stepName });
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
        title={seoTitle}
        description={seoDescription}
        type="article"
        image={seoImage}
        jsonLd={combinedJsonLd}
        publishedTime={article.published_at || article.created_at}
        author={canonicalAuthor}
        articleTags={article.tags}
        articleCategory={article.category}
      />
      <Header />
      <Suspense fallback={null}>
        <ReadingProgressBar />
        <FloatingShareRail url={articleUrl} title={displayTitle} />
        {article.slug === "ghid-investitii-imobiliare-timisoara-2026" && (
          <InvestmentGuideLeadModal triggerOrigin="blog_article" />
        )}
      </Suspense>
      <Suspense fallback={null}>

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

            {/* Discrete location hub cross-link */}
            {geoLocation && (
              <div className="mt-4">
                <Link
                  to={`/blog/locatie/${slugifyLocation(geoLocation)}`}
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
                  aria-label={`Vezi mai multe articole despre ${geoLocation}`}
                  onMouseEnter={() => prefetchHub(slugifyLocation(geoLocation))}
                  onFocus={() => prefetchHub(slugifyLocation(geoLocation))}
                  onClick={() => trackHubClick(geoLocation, "inline")}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>
                    {language === "ro" ? "Articole din zona" : "Articles from"}{" "}
                    <span className="underline underline-offset-2 font-medium">{geoLocation}</span>
                  </span>
                </Link>
              </div>
            )}
          </header>

          {/* Cover Image */}
          {coverImage && (
            <div className="relative aspect-video mb-8 rounded-xl overflow-hidden">
              <img
                src={coverImage}
                alt={displayTitle}
                loading="eager"
                decoding="async"
                {...({ fetchpriority: "high" } as Record<string, string>)}
                sizes="(max-width: 768px) 100vw, 800px"
                className="w-full h-full object-cover"
                onError={handleBlogImageError}
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
          {/<div data-(chart|widget)="/.test(displayContent) ? (
            <div
              className="prose prose-lg dark:prose-invert max-w-none mb-8"
              data-blog-content-root="1"
            >
              {(() => {
                const widgetMap: Record<string, JSX.Element> = {
                  'roi-by-neighborhood': <RoiByNeighborhoodChart key="c1" />,
                  'monthly-yield': <MonthlyYieldChart key="c2" />,
                  'price-appreciation': <PriceAppreciationChart key="c3" />,
                  'restaurant-map': (
                    <Suspense key="w1" fallback={<div className="h-[360px] rounded-xl bg-muted animate-pulse" />}>
                      <RestaurantGuideMap />
                    </Suspense>
                  ),
                };
                const parts = displayContent.split(/<div data-(?:chart|widget)="([^"]+)"><\/div>/);
                return parts.map((part, i) => {
                  if (i % 2 === 1) return widgetMap[part] ?? null;
                  return <div key={i} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(part) }} />;
                });
              })()}
            </div>
          ) : (
            <div
              className="prose prose-lg dark:prose-invert max-w-none mb-8"
              data-blog-content-root="1"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(displayContent) }}
            />
          )}


          {/* Expert Signature — E-E-A-T */}
          <ExpertSignature authorName={article.author_name} />

          {/* Lead Magnet — PDF download (only for the pillar investment guide) */}
          {article.slug === "ghid-investitii-imobiliare-timisoara-2026" && <PdfLeadMagnetButton />}

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
            <InternalLinks category={article.category} tags={article.tags} currentSlug={article.slug} />

            {/* Auto-generated FAQ per article */}
            <ArticleFAQ
              category={article.category}
              articleTitle={displayTitle}
              customFaqs={(article as unknown as { faq_items?: unknown }).faq_items as never}
            />

            {/* Location hub cross-link card */}
            {geoLocation && (
              <Link
                to={`/blog/locatie/${slugifyLocation(geoLocation)}`}
                className="mt-8 flex items-center justify-between gap-4 p-5 rounded-xl border border-border bg-muted/30 hover:bg-muted/60 hover:border-primary/40 transition-colors group"
                aria-label={`Vezi mai multe articole despre ${geoLocation}`}
                onMouseEnter={() => prefetchHub(slugifyLocation(geoLocation))}
                onFocus={() => prefetchHub(slugifyLocation(geoLocation))}
                onClick={() => trackHubClick(geoLocation, "card")}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      {language === "ro" ? "Hub locație" : "Location hub"}
                    </div>
                    <div className="font-semibold text-foreground truncate">
                      {language === "ro"
                        ? `Vezi mai multe articole despre ${geoLocation}`
                        : `See more articles about ${geoLocation}`}
                    </div>
                  </div>
                </div>
                <span className="shrink-0 text-sm text-primary font-medium group-hover:translate-x-0.5 transition-transform">
                  →
                </span>
              </Link>
            )}

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
      </Suspense>
    </div>
  );
};

export default BlogArticlePage;
