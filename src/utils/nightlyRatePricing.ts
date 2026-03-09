/**
 * Nightly rate pricing matrix based on property type and guest capacity.
 * 
 * Rules:
 * - Studio, 2 guests: €45/night
 * - Studio, 3 guests: €60/night
 * - Studio, 4 guests: €65/night
 * - 2-room apt, 2 guests: €65/night
 * - 2-room apt, 4 guests: €75/night
 * - 2-room apt, 6 guests: €90/night
 * - 3-room apt, 7+ guests: €100/night
 */

export type PropertyType = "studio" | "2camere" | "3camere";

export interface NightlyRateResult {
  rate: number;
  label: { ro: string; en: string };
}

const PRICING_MATRIX: { type: PropertyType; minCapacity: number; rate: number }[] = [
  // 3-room apartments (check first — highest tier)
  { type: "3camere", minCapacity: 7, rate: 100 },
  // 2-room apartments
  { type: "2camere", minCapacity: 6, rate: 90 },
  { type: "2camere", minCapacity: 4, rate: 75 },
  { type: "2camere", minCapacity: 2, rate: 65 },
  // Studios
  { type: "studio", minCapacity: 4, rate: 65 },
  { type: "studio", minCapacity: 3, rate: 60 },
  { type: "studio", minCapacity: 2, rate: 45 },
];

export function getNightlyRate(propertyType: PropertyType, capacity: number): number {
  // Find the first matching rule (sorted by most specific first)
  for (const rule of PRICING_MATRIX) {
    if (rule.type === propertyType && capacity >= rule.minCapacity) {
      return rule.rate;
    }
  }
  // Fallback
  return 45;
}

export function getPropertyTypeOptions(language: "ro" | "en") {
  return [
    { value: "studio" as PropertyType, label: language === "ro" ? "Studio" : "Studio" },
    { value: "2camere" as PropertyType, label: language === "ro" ? "Apartament 2 Camere" : "2-Room Apartment" },
    { value: "3camere" as PropertyType, label: language === "ro" ? "Apartament 3 Camere" : "3-Room Apartment" },
  ];
}

export function getCapacityRange(propertyType: PropertyType): { min: number; max: number; defaultVal: number } {
  switch (propertyType) {
    case "studio": return { min: 2, max: 4, defaultVal: 2 };
    case "2camere": return { min: 2, max: 6, defaultVal: 4 };
    case "3camere": return { min: 7, max: 10, defaultVal: 7 };
  }
}
