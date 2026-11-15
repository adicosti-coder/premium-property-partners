/**
 * Search metadata for the hand-written residential-complex landing pages
 * (/complexe/<slug>). Shared by the React page and the static prerender so
 * the title Google sees first matches the one shown after hydration.
 *
 * Yield wording follows the approved commercial grid: only the estimated
 * 6,5–9,4% net range, never guaranteed/verified or open-ended (9%+) claims.
 */
export const APPROVED_YIELD_RANGE = { ro: "6,5–9,4%", en: "6.5–9.4%" } as const;

export interface ComplexLandingSeo {
  title: string;
  description: string;
  h1: string;
}

export function getComplexLandingSeo(name: string, language: "ro" | "en"): ComplexLandingSeo {
  const cleanName = name.trim();
  if (language === "en") {
    return {
      title: `${cleanName} Timișoara | Apartments, prices and yield`,
      description: `Apartments for sale and rent in ${cleanName}, Timișoara, checked by RealTrust, plus short-term rental analysis: estimated net yield ${APPROVED_YIELD_RANGE.en} per year.`,
      h1: `${cleanName} Timișoara — apartments and short-term rental`,
    };
  }
  return {
    title: `${cleanName} Timișoara | Apartamente, prețuri și randament`,
    description: `Apartamente de vânzare și închiriere în ${cleanName}, Timișoara, verificate de RealTrust, plus analiză pentru regim hotelier: randament net estimat ${APPROVED_YIELD_RANGE.ro} pe an.`,
    h1: `${cleanName} Timișoara — apartamente și regim hotelier`,
  };
}

/** Reads `name`/`slug` pairs from the ComplexLanding source (used by the prerender). */
export function readComplexLandingNames(source: string): Map<string, string> {
  const names = new Map<string, string>();
  for (const m of source.matchAll(/name:\s*["']([^"']+)["'],\s*\n\s*slug:\s*["']([a-z0-9-]+)["']/g)) {
    names.set(m[2], m[1]);
  }
  return names;
}
