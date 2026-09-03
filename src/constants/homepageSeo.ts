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
    title: "Real Estate Agency & Property Management Timișoara | RealTrust",
    description:
      "Sales, purchases, long-term rentals and short-term rental apartment management in Timișoara. Investment consulting with 9.4% net yield, calculated transparently.",
    socialDescription:
      "Sales, rentals and short-term rental apartment management in Timișoara.",
    h1: "Integrated real estate services & property management in Timișoara.",
  },
} as const;

export const HOMEPAGE_CANONICAL = "https://realtrust.ro/";

export type HomepageSeoLang = keyof typeof HOMEPAGE_SEO;
