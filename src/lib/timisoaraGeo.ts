// Frontend mirror of supabase/functions/seo-ai-optimizer/localGeo.ts
// Used by the admin Prospect Listings table to compute a per-prospect
// "Geo Match" score from `location` + `zone` + `title`.

export interface LocalEntity {
  name: string;
  category: "neighborhood" | "landmark" | "mall" | "school" | "park" | "transport" | "tourist";
  weight: number;
  keywords: string[];
}

export const TIMISOARA_LOCAL_ENTITIES: LocalEntity[] = [
  { name: "ISHO", category: "neighborhood", weight: 3, keywords: ["isho"] },
  { name: "Aradului", category: "neighborhood", weight: 3, keywords: ["aradului", "calea aradului"] },
  { name: "Girocului", category: "neighborhood", weight: 3, keywords: ["girocului", "calea girocului"] },
  { name: "Complex Studențesc", category: "neighborhood", weight: 3, keywords: ["complex studentesc", "complex studențesc"] },
  { name: "Șagului", category: "neighborhood", weight: 3, keywords: ["sagului", "șagului", "calea sagului"] },
  { name: "Circumvalațiunii", category: "neighborhood", weight: 3, keywords: ["circumvalatiunii", "circumvalațiunii"] },
  { name: "Lipovei", category: "neighborhood", weight: 3, keywords: ["lipovei", "calea lipovei"] },
  { name: "Fabric", category: "neighborhood", weight: 2, keywords: ["fabric"] },
  { name: "Iosefin", category: "neighborhood", weight: 2, keywords: ["iosefin"] },
  { name: "Elisabetin", category: "neighborhood", weight: 2, keywords: ["elisabetin"] },
  { name: "Cetate / Centru", category: "neighborhood", weight: 3, keywords: ["cetate", "centru", "centrul vechi", "piata unirii", "piața unirii", "piata victoriei", "piața victoriei"] },
  { name: "Take Ionescu", category: "neighborhood", weight: 2, keywords: ["take ionescu", "take-ionescu"] },
  { name: "Soarelui", category: "neighborhood", weight: 2, keywords: ["soarelui"] },
  { name: "Dâmbovița", category: "neighborhood", weight: 2, keywords: ["dambovita", "dâmbovița"] },
  { name: "Iulius Town", category: "mall", weight: 3, keywords: ["iulius town", "iulius mall", "openville"] },
  { name: "Shopping City", category: "mall", weight: 2, keywords: ["shopping city", "auchan"] },
  { name: "UVT", category: "school", weight: 3, keywords: ["uvt", "universitatea de vest"] },
  { name: "Politehnica", category: "school", weight: 3, keywords: ["politehnica", "upt"] },
  { name: "UMF", category: "school", weight: 2, keywords: ["umf", "medicina", "medicină"] },
  { name: "Parcul Central", category: "park", weight: 2, keywords: ["parcul central"] },
  { name: "Aeroport", category: "transport", weight: 3, keywords: ["aeroport timisoara", "aeroport timișoara", "aeroportul timișoara"] },
  { name: "Gara de Nord", category: "transport", weight: 2, keywords: ["gara de nord", "gara timisoara nord"] },
  { name: "Bega", category: "tourist", weight: 2, keywords: ["bega", "canalul bega"] },
];

function strip(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export interface ProspectGeoMatch {
  score: number; // 0-100
  found: string[];
  primary: string | null; // top-weight entity matched
}

/** Compute a Geo Relevance score for a prospect based on free-text fields. */
export function computeProspectGeoMatch(parts: (string | null | undefined)[]): ProspectGeoMatch {
  const blob = strip(parts.filter(Boolean).join(" "));
  if (!blob.trim()) return { score: 0, found: [], primary: null };

  const found: { name: string; weight: number }[] = [];
  for (const e of TIMISOARA_LOCAL_ENTITIES) {
    if (e.keywords.some((kw) => blob.includes(strip(kw)))) {
      found.push({ name: e.name, weight: e.weight });
    }
  }

  if (found.length === 0) {
    // If "timisoara" is present at all, give a base score
    return { score: blob.includes("timisoara") || blob.includes("timișoara") ? 35 : 0, found: [], primary: null };
  }

  // Score: each match contributes weight*10, capped at 100, +10 for >=2 distinct
  const raw = found.reduce((sum, f) => sum + f.weight * 10, 0) + (found.length >= 2 ? 10 : 0);
  const score = Math.min(100, raw);
  const primary = [...found].sort((a, b) => b.weight - a.weight)[0]?.name ?? null;
  return { score, found: found.map((f) => f.name), primary };
}
