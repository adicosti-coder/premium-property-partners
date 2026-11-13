/**
 * Dovadă socială pe zonă în calculator: proprietăți de cazare reale administrate de noi,
 * potrivite strict după nume/adresă. Fără potrivire → nimic afișat (nu inventăm vecinătăți).
 */
import type { UnifiedZoneValue } from "./unifiedCalculator";

export interface PortfolioProperty { name: string; slug: string; location: string | null; booking_rating: number | null; booking_review_count: number | null }

const PATTERNS: Partial<Record<UnifiedZoneValue, RegExp>> = {
  "city-of-mara": /\bmara\b|circumvala[tț]iunii\s*1\b/i,
  fructus: /fructus/i,
  ateneo: /ateneo|torontalului\s*104/i,
  nordone: /nord\s*one|marin\s+constantin/i,
  monarch: /monarch/i,
  "ring-residence": /\bring\b/i,
  paltim: /paltim/i,
  "denya-forest": /denya/i,
  "future-residence": /future\s*residence/i,
  alenia: /alenia/i,
  torontalului: /torontal/i,
  central: /ultracentral|cetate|1\s*decembrie|gheorghe\s+laz[aă]r|regele\s+carol|pia[tț]a\s+maria/i,
};

export const MIN_PROOF_RATING = 8.5;
export const MIN_PROOF_REVIEWS = 3;

export function matchPortfolioProperties(zone: UnifiedZoneValue, list: PortfolioProperty[], limit = 2): PortfolioProperty[] {
  const re = PATTERNS[zone];
  if (!re) return [];
  return list
    .filter((p) => re.test(`${p.name} ${p.location ?? ""}`))
    .filter((p) => (p.booking_rating ?? 0) >= MIN_PROOF_RATING && (p.booking_review_count ?? 0) >= MIN_PROOF_REVIEWS)
    .sort((a, b) => (b.booking_review_count ?? 0) - (a.booking_review_count ?? 0))
    .slice(0, limit);
}
