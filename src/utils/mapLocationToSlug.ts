/**
 * Maps scraped location/title text to a priority neighborhood slug.
 * Returns null if no priority zone is matched.
 */

const KEYWORD_MAP: { keywords: string[]; slug: string }[] = [
  { keywords: ["isho", "i should have one"], slug: "isho" },
  { keywords: ["aradului", "iulius", "torontalului", "openville"], slug: "zona-aradului" },
  { keywords: ["girocului", "soarelui", "martirilor"], slug: "zona-girocului" },
  { keywords: ["complex", "studentesc", "studențesc", "uvt", "politehnica"], slug: "complex-studentesc" },
  { keywords: ["sagului", "șagului", "steaua"], slug: "sagului" },
  { keywords: ["mara", "circumvalatiunii", "circumvalațiunii", "bega"], slug: "circumvalatiunii" },
  { keywords: ["lipovei", "ionescu de la brad"], slug: "calea-lipovei" },
];

function removeDiacritics(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function mapLocationToSlug(
  scrapedLocation?: string | null,
  scrapedTitle?: string | null
): string | null {
  const combined = removeDiacritics(
    `${scrapedLocation ?? ""} ${scrapedTitle ?? ""}`
  );

  for (const entry of KEYWORD_MAP) {
    for (const kw of entry.keywords) {
      if (combined.includes(removeDiacritics(kw))) {
        return entry.slug;
      }
    }
  }

  return null;
}

/** Average rent per sqm per neighborhood for quick ROI estimation */
const AVG_MONTHLY_RENT_PER_SQM: Record<string, number> = {
  "isho": 14,
  "zona-aradului": 11.5,
  "zona-girocului": 10,
  "complex-studentesc": 11,
  "sagului": 9.5,
  "circumvalatiunii": 12,
  "calea-lipovei": 9,
};

/**
 * Estimates annual ROI % based on listing price, size, and neighborhood slug.
 * Returns null if data is insufficient.
 */
export function estimateROI(
  price: number,
  sizeSqm: number,
  slug: string
): number | null {
  const rentPerSqm = AVG_MONTHLY_RENT_PER_SQM[slug];
  if (!rentPerSqm || !price || price <= 0 || !sizeSqm || sizeSqm <= 0) return null;

  const annualRent = rentPerSqm * sizeSqm * 12;
  // Subtract ~20% management fees + operating costs
  const netAnnual = annualRent * 0.8;
  const roi = (netAnnual / price) * 100;

  return Math.round(roi * 100) / 100;
}

export const PRIORITY_SLUGS = KEYWORD_MAP.map((e) => e.slug);
