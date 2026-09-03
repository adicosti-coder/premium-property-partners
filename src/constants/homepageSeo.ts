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
    title: "Agenție Imobiliară & Property Management Timișoara | RealTrust",
    description:
      "Vânzări, cumpărări, închirieri și administrare apartamente în regim hotelier în Timișoara. Consultanță pentru investiții imobiliare cu randament net 9,4%.",
    socialDescription:
      "Vânzări, cumpărări, închirieri și administrare apartamente în regim hotelier în Timișoara.",
    h1: "Servicii imobiliare integrate & property management în Timișoara.",
  },
  en: {
    title: "RealTrust Timișoara | Real estate & short-term rentals",
    description:
      "Timișoara real estate with hotel-style operations by ApArt Hotel: sales, rentals and management. 9.4% net yield, calculated transparently. Request your simulation.",
    socialDescription:
      "Professional short-term rental, property management and real estate consulting in Timișoara.",
    h1: "RealTrust Timișoara — short-term rentals, property management and complete real estate services.",
  },
} as const;

export const HOMEPAGE_CANONICAL = "https://realtrust.ro/";

export type HomepageSeoLang = keyof typeof HOMEPAGE_SEO;
