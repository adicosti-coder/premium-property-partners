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
    title: "RealTrust Timișoara | Imobiliare, Investiții & Property Management",
    description:
      "RealTrust Timișoara oferă servicii imobiliare, investiții și administrare de proprietăți în regim hotelier. Analiză de randament, vânzări, închirieri și property management.",
    socialDescription:
      "Servicii imobiliare, investiții și administrare de proprietăți în regim hotelier în Timișoara.",
    h1: "RealTrust Timișoara — Imobiliare, Investiții și Property Management",
  },
  en: {
    title: "RealTrust Timișoara | Real Estate, Investments & Property Management",
    description:
      "RealTrust Timișoara offers real estate services, investment advice and short-stay property management. Yield analysis, sales, rentals and full property management.",
    socialDescription:
      "Real estate services, investments and short-stay property management in Timișoara.",
    h1: "RealTrust Timișoara — Real Estate, Investments and Property Management",
  },
} as const;


export const HOMEPAGE_CANONICAL = "https://realtrust.ro/";

export type HomepageSeoLang = keyof typeof HOMEPAGE_SEO;
