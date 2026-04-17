// Local GEO entities catalog for Timișoara — used to detect local relevance
// Keywords are matched case-insensitive, diacritic-insensitive on the scraped content.

export interface LocalEntity {
  name: string;
  category: "neighborhood" | "landmark" | "mall" | "school" | "park" | "transport" | "tourist";
  weight: number; // 1 = nice to have, 3 = critical local signal
  keywords: string[];
}

export const TIMISOARA_LOCAL_ENTITIES: LocalEntity[] = [
  // Neighborhoods (high weight — core local SEO)
  { name: "ISHO", category: "neighborhood", weight: 3, keywords: ["isho"] },
  { name: "Zona Aradului", category: "neighborhood", weight: 3, keywords: ["aradului", "calea aradului"] },
  { name: "Zona Girocului", category: "neighborhood", weight: 3, keywords: ["girocului", "calea girocului"] },
  { name: "Complex Studențesc", category: "neighborhood", weight: 3, keywords: ["complex studentesc", "complex studențesc"] },
  { name: "Calea Șagului", category: "neighborhood", weight: 3, keywords: ["sagului", "șagului", "calea sagului"] },
  { name: "Circumvalațiunii", category: "neighborhood", weight: 3, keywords: ["circumvalatiunii", "circumvalațiunii"] },
  { name: "Calea Lipovei", category: "neighborhood", weight: 3, keywords: ["lipovei", "calea lipovei"] },
  { name: "Fabric", category: "neighborhood", weight: 2, keywords: ["fabric"] },
  { name: "Iosefin", category: "neighborhood", weight: 2, keywords: ["iosefin"] },
  { name: "Elisabetin", category: "neighborhood", weight: 2, keywords: ["elisabetin"] },
  { name: "Cetate / Centru", category: "neighborhood", weight: 3, keywords: ["cetate", "centrul vechi", "piata unirii", "piața unirii", "piata victoriei", "piața victoriei"] },
  { name: "Take Ionescu", category: "neighborhood", weight: 2, keywords: ["take ionescu", "take-ionescu"] },
  { name: "Soarelui", category: "neighborhood", weight: 2, keywords: ["soarelui"] },
  { name: "Dâmbovița", category: "neighborhood", weight: 2, keywords: ["dambovita", "dâmbovița"] },

  // Major landmarks / malls (mid-high weight)
  { name: "Iulius Town / Iulius Mall", category: "mall", weight: 3, keywords: ["iulius town", "iulius mall", "openville"] },
  { name: "Shopping City Timișoara", category: "mall", weight: 2, keywords: ["shopping city", "auchan timișoara", "auchan timisoara"] },
  { name: "Vox Park", category: "mall", weight: 1, keywords: ["vox park"] },

  // Universities & schools
  { name: "UVT (Universitatea de Vest)", category: "school", weight: 3, keywords: ["uvt", "universitatea de vest"] },
  { name: "Politehnica Timișoara", category: "school", weight: 3, keywords: ["politehnica", "upt"] },
  { name: "UMF / Medicină", category: "school", weight: 2, keywords: ["umf", "medicina", "medicină"] },

  // Parks / green spaces
  { name: "Parcul Central", category: "park", weight: 2, keywords: ["parcul central"] },
  { name: "Parcul Rozelor", category: "park", weight: 2, keywords: ["parcul rozelor"] },
  { name: "Parcul Botanic", category: "park", weight: 1, keywords: ["parcul botanic", "gradina botanica", "grădina botanică"] },

  // Transport hubs
  { name: "Aeroport Timișoara", category: "transport", weight: 3, keywords: ["aeroport timisoara", "aeroport timișoara", "aeroportul timișoara", "tsr"] },
  { name: "Gara de Nord", category: "transport", weight: 2, keywords: ["gara de nord", "gara timisoara nord"] },

  // Tourist / business landmarks
  { name: "Catedrala Mitropolitană", category: "tourist", weight: 1, keywords: ["catedrala mitropolitana", "catedrala mitropolitană"] },
  { name: "Bega", category: "tourist", weight: 2, keywords: ["bega", "canalul bega"] },
  { name: "Spitalul Județean", category: "landmark", weight: 2, keywords: ["spitalul judetean", "spitalul județean"] },
];

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export interface LocalGeoAnalysis {
  found: { name: string; category: string; weight: number }[];
  missing: { name: string; category: string; weight: number }[];
  score: number; // 0-100
  has_proximity_signals: boolean;
  proximity_keywords_found: string[];
}

const PROXIMITY_KEYWORDS = [
  "aproape de", "lângă", "langa", "in apropiere", "în apropiere",
  "la x minute", "minute pe jos", "minute mers", "vis-a-vis", "vis-à-vis",
  "alaturi de", "alături de", "in vecinatate", "în vecinătate",
  "5 minute", "10 minute", "15 minute", "walking distance", "near", "close to",
];

export function analyzeLocalGeo(text: string): LocalGeoAnalysis {
  const norm = stripDiacritics(text);
  const found: LocalGeoAnalysis["found"] = [];
  const missing: LocalGeoAnalysis["missing"] = [];

  for (const entity of TIMISOARA_LOCAL_ENTITIES) {
    const hit = entity.keywords.some((kw) => norm.includes(stripDiacritics(kw)));
    if (hit) {
      found.push({ name: entity.name, category: entity.category, weight: entity.weight });
    } else if (entity.weight >= 2) {
      // only include "medium / high" weight entities in the missing list to keep noise low
      missing.push({ name: entity.name, category: entity.category, weight: entity.weight });
    }
  }

  const proximity_keywords_found = PROXIMITY_KEYWORDS.filter((kw) => norm.includes(stripDiacritics(kw)));
  const has_proximity_signals = proximity_keywords_found.length > 0;

  // Scoring: weighted entity coverage + proximity bonus, with penalty if no proximity at all
  const totalWeight = TIMISOARA_LOCAL_ENTITIES.reduce((s, e) => s + e.weight, 0);
  const foundWeight = found.reduce((s, e) => s + e.weight, 0);
  let score = Math.round((foundWeight / totalWeight) * 100);

  // Cap raw coverage to 80, leave 20 points for proximity quality
  score = Math.min(score * 1.2, 80);

  if (has_proximity_signals) {
    score += Math.min(proximity_keywords_found.length * 5, 20);
  } else {
    // Penalty: if the page mentions zero proximity language, cap score
    score = Math.min(score, 55);
  }

  // Floor + ceiling
  score = Math.max(0, Math.min(100, Math.round(score)));

  return { found, missing, score, has_proximity_signals, proximity_keywords_found };
}
