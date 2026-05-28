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
  // Cartiere centrale
  { name: "Cetate / Centru", category: "neighborhood", weight: 3, keywords: ["cetate", "centru", "centrul vechi", "piata unirii", "piața unirii", "piata victoriei", "piața victoriei"] },
  { name: "Iosefin", category: "neighborhood", weight: 3, keywords: ["iosefin"] },
  { name: "Fabric", category: "neighborhood", weight: 3, keywords: ["fabric"] },
  { name: "Elisabetin", category: "neighborhood", weight: 2, keywords: ["elisabetin"] },
  { name: "Take Ionescu", category: "neighborhood", weight: 2, keywords: ["take ionescu", "take-ionescu"] },
  { name: "Tipografilor", category: "neighborhood", weight: 2, keywords: ["tipografilor"] },
  // Cartiere nord
  { name: "Dumbrăvița", category: "neighborhood", weight: 3, keywords: ["dumbravita", "dumbrăvița"] },
  { name: "Aradului", category: "neighborhood", weight: 3, keywords: ["aradului", "calea aradului"] },
  { name: "Mehala", category: "neighborhood", weight: 2, keywords: ["mehala"] },
  { name: "Lipovei", category: "neighborhood", weight: 3, keywords: ["lipovei", "calea lipovei"] },
  { name: "Torontalului", category: "neighborhood", weight: 2, keywords: ["torontalului", "calea torontalului"] },
  { name: "Ronat", category: "neighborhood", weight: 2, keywords: ["ronat"] },
  { name: "Bucovina", category: "neighborhood", weight: 2, keywords: ["bucovina"] },
  { name: "Circumvalațiunii", category: "neighborhood", weight: 3, keywords: ["circumvalatiunii", "circumvalațiunii"] },
  // Cartiere sud / est
  { name: "Girocului", category: "neighborhood", weight: 3, keywords: ["girocului", "calea girocului"] },
  { name: "Șagului", category: "neighborhood", weight: 3, keywords: ["sagului", "șagului", "calea sagului"] },
  { name: "Soarelui", category: "neighborhood", weight: 2, keywords: ["soarelui"] },
  { name: "Complex Studențesc", category: "neighborhood", weight: 3, keywords: ["complex studentesc", "complex studențesc"] },
  { name: "Olimpia / Stadion", category: "neighborhood", weight: 2, keywords: ["olimpia", "stadion"] },
  { name: "Plopi", category: "neighborhood", weight: 2, keywords: ["plopi"] },
  { name: "Blașcovici", category: "neighborhood", weight: 2, keywords: ["blascovici", "blașcovici"] },
  { name: "Freidorf", category: "neighborhood", weight: 2, keywords: ["freidorf"] },
  { name: "Dâmbovița", category: "neighborhood", weight: 2, keywords: ["dambovita", "dâmbovița"] },
  // Periurban
  { name: "Ghiroda", category: "neighborhood", weight: 2, keywords: ["ghiroda"] },
  { name: "Moșnița Nouă", category: "neighborhood", weight: 2, keywords: ["mosnita", "moșnița"] },
  { name: "Remetea Mare", category: "neighborhood", weight: 2, keywords: ["remetea"] },
  { name: "Chișoda", category: "neighborhood", weight: 2, keywords: ["chisoda", "chișoda"] },
  { name: "Săcălaz", category: "neighborhood", weight: 2, keywords: ["sacalaz", "săcălaz"] },
  // Complexe rezidențiale recunoscute automat
  { name: "ISHO", category: "neighborhood", weight: 3, keywords: ["isho"] },
  { name: "Paltim", category: "neighborhood", weight: 3, keywords: ["paltim"] },
  { name: "Fructus Plaza", category: "neighborhood", weight: 3, keywords: ["fructus"] },
  { name: "City of Mara", category: "neighborhood", weight: 3, keywords: ["city of mara", "city-of-mara"] },
  { name: "Vivalia", category: "neighborhood", weight: 2, keywords: ["vivalia"] },
  { name: "Ateneo", category: "neighborhood", weight: 2, keywords: ["ateneo"] },
  { name: "Iris", category: "neighborhood", weight: 2, keywords: ["iris"] },
  { name: "Adora Forest", category: "neighborhood", weight: 2, keywords: ["adora forest", "adora"] },
  { name: "Nord One", category: "neighborhood", weight: 2, keywords: ["nord one"] },
  { name: "Monarch", category: "neighborhood", weight: 2, keywords: ["monarch"] },
  { name: "Vox Vertical Village", category: "neighborhood", weight: 2, keywords: ["vox vertical", "vox vertical village"] },
  { name: "Uranus Plaza", category: "neighborhood", weight: 2, keywords: ["uranus plaza", "uranus"] },
  { name: "X City Oasis", category: "neighborhood", weight: 2, keywords: ["x city", "xcity", "x-city oasis"] },
  // Landmarks
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
