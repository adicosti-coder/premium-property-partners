/**
 * Blog CTA — UTM injection + A/B test variants for anchor text.
 *
 * Used by BlogArticle to dynamically rewrite all <a data-cta-blog="...">
 * links inside article content so they carry:
 *   utm_source=realtrust_blog
 *   utm_medium=internal_cta
 *   utm_campaign=<article-category or 'blog'>
 *   utm_content=<article-slug>
 *   utm_term=<cta-variant-id>     (A/B test)
 *
 * Variants are sticky per visitor (localStorage) so the same user always
 * sees the same wording, enabling clean conversion measurement via
 * cta_analytics.metadata.cta_variant_id.
 */

import { isBrowser, safeLocalStorage } from "@/utils/browserStorage";

export type BlogCtaTarget = "evaluare-gratuita" | "contact";

export interface CtaVariant {
  id: string;
  /** Display label that replaces the anchor's text content */
  label: string;
}

/**
 * A/B variants per CTA target. Add new variants here to expand the test —
 * assignment is random-uniform over the array.
 *
 * The first entry of each list is the "control" (current production copy).
 */
export const BLOG_CTA_VARIANTS: Record<BlogCtaTarget, CtaVariant[]> = {
  "evaluare-gratuita": [
    { id: "control", label: "Cere evaluare gratuită" },
    { id: "v2_urgent", label: "Vreau evaluare gratuită acum" },
    { id: "v3_benefit", label: "Află cât valorează apartamentul tău (gratuit)" },
    { id: "v4_simple", label: "Solicită evaluare → răspuns în 24h" },
  ],
  contact: [
    { id: "control", label: "Contactează-ne" },
    { id: "v2_direct", label: "Vorbește cu un consultant" },
    { id: "v3_book", label: "Programează o discuție 15 min" },
    { id: "v4_whatsapp", label: "Scrie-ne pe WhatsApp" },
  ],
};

const STORAGE_PREFIX = "blog_cta_ab_v1_";

/** Get or assign (sticky) an A/B variant id for a given CTA target. */
export const getOrAssignCtaVariant = (target: BlogCtaTarget): CtaVariant => {
  const list = BLOG_CTA_VARIANTS[target] || [];
  if (list.length === 0) return { id: "control", label: "" };
  if (!isBrowser()) return list[0];

  const key = `${STORAGE_PREFIX}${target}`;
  const existing = safeLocalStorage.getItem(key);
  if (existing) {
    const found = list.find((v) => v.id === existing);
    if (found) return found;
  }
  const picked = list[Math.floor(Math.random() * list.length)];
  safeLocalStorage.setItem(key, picked.id);
  return picked;
};

/**
 * Append UTM parameters to a CTA href without clobbering existing query
 * params (e.g. a manual ?prop=123 stays intact, only utm_* are forced).
 */
export const injectUtmParams = (
  rawHref: string,
  opts: {
    target: BlogCtaTarget;
    slug?: string | null;
    category?: string | null;
    variantId?: string | null;
  }
): string => {
  try {
    // Parse against a synthetic origin so relative paths like
    // "/evaluare-gratuita" are handled identically to absolute URLs.
    const base =
      isBrowser() && window.location?.origin ? window.location.origin : "https://realtrust.ro";
    const url = new URL(rawHref, base);

    url.searchParams.set("utm_source", "realtrust_blog");
    url.searchParams.set("utm_medium", "internal_cta");
    url.searchParams.set(
      "utm_campaign",
      (opts.category || "blog").toString().toLowerCase().replace(/\s+/g, "_").slice(0, 60)
    );
    if (opts.slug) url.searchParams.set("utm_content", opts.slug);
    if (opts.variantId) url.searchParams.set("utm_term", opts.variantId);

    // Preserve relative form for same-origin links so SPA routing still works.
    if (url.origin === base) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
    return url.toString();
  } catch {
    return rawHref;
  }
};
