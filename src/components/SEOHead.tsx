import { Helmet } from "react-helmet-async";
import { useEffect, useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { BRAND, ORG_ID, SITE_ORIGIN, ORGANIZATION_SCHEMA } from "@/lib/orgIdentity";
import { validateJsonLdConsistency } from "@/lib/schemaConsistency";

// Canonical host: NO www, matches CanonicalHreflang.tsx + prerender + sitemap.
// Mismatching www/non-www between og:url, canonical and hreflang triggers
// Lighthouse "Document does not have a valid rel=canonical".
const BASE_URL = SITE_ORIGIN;

interface SEOHeadProps {
  title?: string;
  description?: string;
  /** Shorter description used only for og:description / twitter:description. */
  socialDescription?: string;
  image?: string;
  imageAlt?: string;
  url?: string;
  type?: "website" | "article" | "product";
  publishedTime?: string;
  author?: string;
  noIndex?: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  // Article specific
  articleTags?: string[];
  articleCategory?: string;
  // Product specific (for properties)
  productPrice?: number;
  productCurrency?: string;
  productAvailability?: "InStock" | "OutOfStock" | "PreOrder";
  // FAQ specific
  /** @deprecated Use useRegisterFAQs() hook instead — kept for backward compat, items are ignored */
  faqItems?: Array<{ question: string; answer: string }>;
  // Breadcrumb
  breadcrumbItems?: Array<{ name: string; url: string }>;
  // Enable WebSite schema with SearchAction (for homepage)
  includeWebSiteSchema?: boolean;
  /**
   * Optional query string (e.g. "?page=2") appended to the self-referential
   * canonical for paginated archives. When set, the canonical becomes
   * self-referential per page, which is Google's current recommendation for
   * paginated lists (rel=prev/next deprecated). Leave undefined for page 1
   * so it canonicalizes to the clean URL.
   */
  canonicalQuery?: string;
}

// Helper to generate Article JSON-LD
const generateArticleJsonLd = (
  title: string,
  description: string,
  image: string,
  url: string,
  publishedTime?: string,
  author?: string,
  tags?: string[],
  category?: string
) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": title,
  "description": description,
  "image": image,
  "url": url,
  "datePublished": publishedTime,
  ...(author ? { "author": { "@type": "Person", "name": author } } : {
    "author": { "@type": "Organization", "@id": ORG_ID, "name": BRAND.legalName },
  }),
  "publisher": {
    "@type": "Organization",
    "@id": ORG_ID,
    "name": BRAND.name,
    "logo": {
      "@type": "ImageObject",
      "url": BRAND.logo,
      "width": 800,
      "height": 450,
    },
  },
  ...(tags && tags.length > 0 && { "keywords": tags.join(", ") }),
  ...(category && { "articleSection": category }),
});

// FAQ schema is now handled centrally by FAQSchemaProvider (useFAQSchema.tsx)
// generateFaqJsonLd was removed to prevent duplicate FAQPage blocks

// Helper to generate Breadcrumb JSON-LD
const generateBreadcrumbJsonLd = (items: Array<{ name: string; url: string }>) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": items.map((item, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "name": item.name,
    "item": item.url,
  })),
});

// Helper to generate WebSite schema with SearchAction
const generateWebSiteJsonLd = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "RealTrust",
  "alternateName": "RealTrust",
  "url": BASE_URL,
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": `${BASE_URL}/oaspeti?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
  "inLanguage": ["ro-RO", "en-US"],
});

const SEOHead = ({
  title,
  description,
  socialDescription,
  image = `${BASE_URL}/images/hero-optimized-1920w.webp`,
  imageAlt,
  url,
  type = "website",
  publishedTime,
  author,
  noIndex = false,
  jsonLd,
  articleTags,
  articleCategory,
  productPrice,
  productCurrency = "EUR",
  productAvailability = "InStock",
  faqItems,
  breadcrumbItems,
  includeWebSiteSchema = false,
  canonicalQuery,
}: SEOHeadProps) => {
  const { language } = useLanguage();
  const [override, setOverride] = useState<import("@/hooks/useSeoOverride").SeoOverride | null>(null);
  
  const defaultTitles = {
    ro: "RealTrust Timișoara | Regim Hotelier & Servicii Imobiliare",
    en: "RealTrust | Trust Estate - Real Estate Investment & Property Management Timișoara"
  };
  
  const defaultDescriptions = {
    ro: "RealTrust oferă servicii profesionale de regim hotelier, property management și consultanță imobiliară în Timișoara. Maximizează randamentul investiției tale.",
    en: "Professional short-term rental, property management and real estate consulting in Timișoara. Maximize the return on your investment with RealTrust."
  };

  const defaultSocialDescriptions = {
    ro: "Servicii profesionale de regim hotelier, property management și consultanță imobiliară în Timișoara.",
    en: "Professional short-term rental, property management and real estate consulting in Timișoara."
  };
  
  useEffect(() => {
    let cancelled = false;
    const events = ["click", "touchstart", "keydown", "scroll"] as const;
    const loadOverride = () => {
      events.forEach((event) => document.removeEventListener(event, loadOverride as EventListener));
      const pathname = typeof window !== "undefined" ? window.location.pathname : undefined;
      window.requestIdleCallback?.(() => {
        import("@/hooks/useSeoOverride")
          .then(({ readSeoOverride }) => readSeoOverride(pathname))
          .then((value) => { if (!cancelled) setOverride(value); })
          .catch(() => { if (!cancelled) setOverride(null); });
      }) ?? window.setTimeout(() => {
        import("@/hooks/useSeoOverride")
          .then(({ readSeoOverride }) => readSeoOverride(pathname))
          .then((value) => { if (!cancelled) setOverride(value); })
          .catch(() => { if (!cancelled) setOverride(null); });
      }, 1);
    };
    events.forEach((event) => document.addEventListener(event, loadOverride as EventListener, { once: true, passive: true }));
    return () => {
      cancelled = true;
      events.forEach((event) => document.removeEventListener(event, loadOverride as EventListener));
    };
  }, []);
  const baseTitle = title || defaultTitles[language as keyof typeof defaultTitles] || defaultTitles.ro;
  const baseDescription = description || defaultDescriptions[language as keyof typeof defaultDescriptions] || defaultDescriptions.ro;
  // SEO override (from admin SEO AI Optimizer) takes precedence over all runtime defaults,
  // including explicit per-page props. Otherwise "Implementează automat" cannot affect pages
  // that already pass title/description into SEOHead.
  const finalTitle = override?.title || baseTitle;
  const finalDescription = override?.meta_description || baseDescription;
  const finalSocialDescription =
    override?.meta_description ||
    socialDescription ||
    description ||
    defaultSocialDescriptions[language as keyof typeof defaultSocialDescriptions] ||
    defaultSocialDescriptions.ro;
  const overrideKeywords = override?.extra_keywords?.map((k) => k.keyword).filter(Boolean) || [];
  
  // Canonical URL: ALWAYS absolute on realtrust.ro (non-www, matches global canonical), pathname only (NO query params, NO hash, NO trailing slash except root).
  // This ensures Google indexes one version per page regardless of ?lang, ?utm_*, ?id, filters, etc.
  const buildCanonical = (): string => {
    let pathname: string;
    if (url) {
      try {
        // If a full URL is provided, extract just the pathname.
        const parsed = new URL(url, BASE_URL);
        pathname = parsed.pathname;
      } catch {
        pathname = url.startsWith("/") ? url.split("?")[0].split("#")[0] : "/";
      }
    } else if (typeof window !== "undefined") {
      pathname = window.location.pathname;
    } else {
      pathname = "/";
    }
    // Normalize: collapse duplicate slashes, strip trailing slash (except root)
    pathname = pathname.replace(/\/{2,}/g, "/");
    if (pathname.length > 1 && pathname.endsWith("/")) pathname = pathname.slice(0, -1);
    let canonical = `${BASE_URL}${pathname}`;
    if (canonicalQuery && canonicalQuery.startsWith("?") && canonicalQuery.length > 1) {
      canonical += canonicalQuery;
    }
    return canonical;
  };
  // Overrides may be stored with a www host; force the non-www official origin
  // so og:url can never disagree with the canonical / hreflang tags.
  const forceNonWww = (url: string): string =>
    url.replace(/^https?:\/\/(www\.)?realtrust\.ro/i, BASE_URL);
  const finalUrl = forceNonWww(override?.canonical_url || buildCanonical());


  // og:image / twitter:image MUST be absolute URLs — Facebook, LinkedIn,
  // WhatsApp, and X silently drop previews when the value is relative
  // (`/images/foo.jpg`) or a bundler hash path. Normalise every source
  // (prop, override, fallback) against BASE_URL so social crawlers always
  // see an https://realtrust.ro/... URL.
  const toAbsoluteImage = (src?: string | null): string => {
    const fallback = `${BASE_URL}/images/hero-optimized-1920w.webp`;
    const raw = (src ?? "").trim();
    if (!raw) return fallback;
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith("//")) return `https:${raw}`;
    if (raw.startsWith("data:") || raw.startsWith("blob:")) return fallback;
    return `${BASE_URL}${raw.startsWith("/") ? "" : "/"}${raw}`;
  };
  const absoluteImage = toAbsoluteImage(image);

  // Hreflang alternates — language is a client-side state (LanguageContext), not a URL segment.
  // Both RO and EN share the SAME canonical URL (no ?lang= param) to prevent GSC "alternative
  // page with canonical tag" duplicates. Google treats hreflang variants pointing to the same
  // URL as a single canonical page in multiple languages.
  const getAlternateUrl = (_lang: string) => finalUrl;
  
  // Default schema: only the canonical Organization node. Per-page
  // LocalBusiness / RealEstateAgent nodes are emitted by the pages that
  // actually describe those services, so no page carries irrelevant or
  // duplicated business schema.
  const defaultJsonLd: Record<string, unknown> = { ...ORGANIZATION_SCHEMA };

  
  // SEO override from admin can inject a custom JSON-LD that wins over everything below.
  const overrideJsonLd = override?.json_ld || null;
  // Determine which JSON-LD to use based on type
  let finalJsonLd: Record<string, unknown> | Record<string, unknown>[] =
    overrideJsonLd || jsonLd || defaultJsonLd;
  if (!jsonLd && !overrideJsonLd) {
    const schemas: Record<string, unknown>[] = [defaultJsonLd];
    
    // Add Organization reference so every page carries the canonical brand node
    
    // Add Article schema if type is article
    if (type === "article") {
      schemas.push(
        generateArticleJsonLd(
          finalTitle,
          finalDescription,
          absoluteImage,
          finalUrl,
          publishedTime,
          author,
          articleTags,
          articleCategory
        )
      );
    }
    
    // Property pages pass their own listing schema via the jsonLd prop.
    // No generic Product/LodgingBusiness fallback is injected here.

    // FAQ schema is now handled by the centralized FAQSchemaProvider (useFAQSchema.tsx)
    // Do NOT inject inline FAQPage here — it causes duplicate structured data
    
    // Add Breadcrumb schema if breadcrumbItems provided
    if (breadcrumbItems && breadcrumbItems.length > 0) {
      schemas.push(generateBreadcrumbJsonLd(breadcrumbItems));
    }
    
    // Add WebSite schema with SearchAction if enabled
    if (includeWebSiteSchema) {
      schemas.push(generateWebSiteJsonLd());
    }
    
    finalJsonLd = schemas.length === 1 ? schemas[0] : schemas;
  }

  // BreadcrumbList must also be emitted when a page supplies custom JSON-LD,
  // as long as the custom graph does not already contain one.
  if (breadcrumbItems && breadcrumbItems.length > 0) {
    const nodes = Array.isArray(finalJsonLd) ? finalJsonLd : [finalJsonLd];
    const hasBreadcrumb = nodes.some((n) => {
      const t = (n as Record<string, unknown>)?.["@type"];
      return t === "BreadcrumbList" || (Array.isArray(t) && t.includes("BreadcrumbList"));
    });
    if (!hasBreadcrumb) {
      finalJsonLd = [...nodes, generateBreadcrumbJsonLd(breadcrumbItems)];
    }
  }

  // Dev-only: warn if any node in the assembled JSON-LD conflicts with the
  // canonical brand identity (phone / email / city). Production no-op.
  if (import.meta.env?.DEV) {
    validateJsonLdConsistency(finalJsonLd, `SEOHead(${finalUrl})`);
  }

  // Keep static shell meta tags in sync after hydration. The original index.html
  // meta tags remain in <head>; if we only add Helmet tags, crawlers can read the
  // stale homepage description first and the SEO audit appears "stuck".
  useEffect(() => {
    if (typeof document === "undefined") return;

    const syncMeta = (selector: string, attrs: Record<string, string>, content: string) => {
      const nodes = Array.from(document.head.querySelectorAll<HTMLMetaElement>(selector));
      const targets = nodes.length ? nodes : [document.createElement("meta")];
      targets.forEach((node) => {
        Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
        node.setAttribute("content", content);
        if (!node.parentElement) document.head.appendChild(node);
      });
      // Deduplicate: keep the react-helmet-managed tag when present (it owns
      // re-renders), otherwise the first one, and drop the leftovers so audits
      // never see two tags for the same meta name/property.
      if (targets.length > 1) {
        const keep = targets.find((n) => n.hasAttribute("data-rh")) ?? targets[0];
        targets.forEach((node) => {
          if (node !== keep && !node.hasAttribute("data-rh")) node.remove();
        });
      }
    };


    document.title = finalTitle;
    syncMeta('meta[name="title"]', { name: "title" }, finalTitle);
    syncMeta('meta[name="description"]', { name: "description" }, finalDescription);
    syncMeta('meta[property="og:title"]', { property: "og:title" }, finalTitle);
    syncMeta('meta[property="og:description"]', { property: "og:description" }, finalSocialDescription);
    syncMeta('meta[name="twitter:title"]', { name: "twitter:title" }, finalTitle);
    syncMeta('meta[name="twitter:description"]', { name: "twitter:description" }, finalSocialDescription);
    // og:url / og:image must self-reference the current route — the static
    // shell keeps the homepage values, so crawlers reading the first tag would
    // attribute this page's preview to "/".
    syncMeta('meta[property="og:url"]', { property: "og:url" }, finalUrl);
    syncMeta('meta[name="twitter:url"]', { name: "twitter:url" }, finalUrl);
    syncMeta('meta[property="og:image"]', { property: "og:image" }, absoluteImage);
    syncMeta('meta[name="twitter:image"]', { name: "twitter:image" }, absoluteImage);
  }, [finalTitle, finalDescription, finalSocialDescription, finalUrl, absoluteImage]);

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{finalTitle}</title>
      <meta name="title" content={finalTitle} />
      <meta name="description" content={finalDescription} />
      {overrideKeywords.length > 0 && (
        <meta name="keywords" content={overrideKeywords.join(", ")} />
      )}
      {/*
        Canonical + hreflang are emitted globally by
        <CanonicalHreflang /> (mounted once in the router) to guarantee a
        single, consistent canonical per route. Do NOT re-emit them here,
        otherwise Lighthouse reports "Document does not have a valid
        rel=canonical" because hreflang and canonical disagree.
        Admin SEO override (override?.canonical_url) is intentionally not
        emitted as a second <link rel="canonical">; if per-route overrides
        are needed, extend CanonicalHreflang to consume the override.
      */}
      <meta name="robots" content={noIndex ? "noindex, nofollow" : "index, follow"} />
      <html lang={language} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={finalUrl} />
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalSocialDescription} />
      <meta property="og:image" content={absoluteImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={imageAlt || finalTitle} />
      <meta property="og:locale" content={language === "ro" ? "ro_RO" : "en_US"} />
      <meta property="og:locale:alternate" content={language === "ro" ? "en_US" : "ro_RO"} />
      <meta property="og:site_name" content="RealTrust & ApArt Hotel" />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={finalUrl} />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={finalSocialDescription} />
      <meta name="twitter:image" content={absoluteImage} />
      <meta name="twitter:image:alt" content={imageAlt || finalTitle} />
      
      {/* Article specific */}
      {type === "article" && publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {type === "article" && author && (
        <meta property="article:author" content={author} />
      )}
      {type === "article" && articleTags && articleTags.length > 0 && (
        <meta property="article:tag" content={articleTags.join(",")} />
      )}
      
      {/* Product specific */}
      {type === "product" && productPrice && (
        <>
          <meta property="product:price:amount" content={String(productPrice)} />
          <meta property="product:price:currency" content={productCurrency} />
        </>
      )}
      
      {/* JSON-LD Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(finalJsonLd)}
      </script>
    </Helmet>
  );
};

export default SEOHead;
