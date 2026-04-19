/**
 * Single source of truth for the homepage SEO signals.
 * Used by:
 *  - src/pages/Index.tsx        (React runtime <SEOHead>)
 *  - src/components/SEOHead.tsx (defaults)
 *  - plugins/vite-prerender-seo.ts (static prerender)
 *  - index.html shell           (kept in sync manually — see comment below)
 *
 * Keep these strings ≤ ~155 chars (description) and ≤ 60 chars (title).
 * Changing them here updates Index, SEOHead, and prerender automatically.
 * The static `index.html` shell must be updated manually to match.
 */

export const HOMEPAGE_SEO = {
  ro: {
    title: "RealTrust Timișoara | Imobiliare, Regim Hotelier & ROI",
    description:
      "Investește profitabil în imobiliare Timișoara! Apartamente regim hotelier, vânzări, închirieri lângă UVT, Iulius Town, Aeroport. Calculează ROI gratuit!",
    h1: "RealTrust & ApArt Hotel Timișoara — imobiliare & regim hotelier cu randament garantat.",
  },
  en: {
    title: "RealTrust Timișoara | Real Estate, Short-Term Rentals & ROI",
    description:
      "Short-term rental apartments and real estate investments in Timișoara, near Timișoara Airport, UVT and Iulius Town. Calculate ROI free.",
    h1: "RealTrust & ApArt Hotel Timișoara — real estate & short-term rentals with guaranteed yield.",
  },
} as const;

export const HOMEPAGE_CANONICAL = "https://www.realtrust.ro/";

export type HomepageSeoLang = keyof typeof HOMEPAGE_SEO;
