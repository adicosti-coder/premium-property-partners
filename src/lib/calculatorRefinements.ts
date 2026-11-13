/**
 * Bifele „Rafinează estimarea” din calculatorul unificat.
 * Procente aprobate de Adrian Costi (13 nov 2026): vânzare / tarif pe noapte / ocupare.
 * Se adună (nu se compun), iar ocuparea rămâne plafonată la grila 65–75%.
 */
export const REFINEMENTS = [
  { key: "parking", ro: "Loc de parcare / garaj inclus", en: "Parking space / garage included", sale: 0.05, nightly: 0.03, occupancy: 0 },
  { key: "newBuild", ro: "Bloc nou (după 2018)", en: "New building (after 2018)", sale: 0.07, nightly: 0.05, occupancy: 0 },
  { key: "heatingAc", ro: "Centrală proprie + AC", en: "Own boiler + air conditioning", sale: 0.02, nightly: 0.04, occupancy: 0 },
  { key: "furnished", ro: "Complet mobilat & utilat modern", en: "Fully furnished & modern appliances", sale: 0.03, nightly: 0.08, occupancy: 0.02 },
] as const;

export type RefinementKey = (typeof REFINEMENTS)[number]["key"];
export type Refinements = Record<RefinementKey, boolean>;

export const NO_REFINEMENTS: Refinements = { parking: false, newBuild: false, heatingAc: false, furnished: false };

export function refinementFactors(r?: Refinements | null) {
  let sale = 0, nightly = 0, occupancyBonus = 0;
  if (r) for (const item of REFINEMENTS) {
    if (!r[item.key]) continue;
    sale += item.sale; nightly += item.nightly; occupancyBonus += item.occupancy;
  }
  return { sale: 1 + sale, nightly: 1 + nightly, occupancyBonus: Math.round(occupancyBonus * 100) / 100 };
}

export function activeRefinementLabels(r: Refinements, language: "ro" | "en" = "ro"): string[] {
  return REFINEMENTS.filter((item) => r[item.key]).map((item) => item[language]);
}
