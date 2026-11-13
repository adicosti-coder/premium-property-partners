import { hasAnalyticsConsent } from "./conversionTracking";
import { PROPERTY_TYPES } from "./ownerIncomeEstimate";
import { isValidPropertySurface, UNIFIED_ZONES, type LocationMode } from "./unifiedCalculator";
import { INTENTS, type Intent, type LeadCalculatorEvent } from "./calculatorValuation";

export const REGIONAL_DESTINATIONS = [
  "București", "Cluj-Napoca", "Brașov", "Sibiu", "Iași", "Constanța", "Oradea", "Arad", "Craiova",
  "Timișoara", "Galați", "Ploiești", "Pitești", "Bacău", "Baia Mare", "Târgu Mureș", "Suceava", "Alba Iulia",
  "Bistrița", "Deva", "Piatra Neamț", "Târgu Jiu", "Tulcea", "Satu Mare", "Buzău", "Râmnicu Vâlcea",
  "Poiana Brașov", "Sinaia", "Predeal", "Bușteni", "Azuga", "Bran", "Râșnov", "Vatra Dornei", "Borșa",
  "Mamaia", "Vama Veche", "Eforie Nord", "Eforie Sud", "Costinești", "Neptun", "Olimp", "Mangalia", "Năvodari",
  "Sovata", "Băile Felix", "Băile Herculane", "Călimănești", "Căciulata", "Băile Tușnad", "Murani",
] as const;

const normalize = (value: string) => value.normalize("NFKD").replace(/\p{M}/gu, "").replace(/[\s\u200B-\u200D\uFEFF]+/g, " ").trim().toLocaleLowerCase("ro");

// Prepare the fixed catalog once, not for every keystroke or keyboard navigation.
const regionalSearchIndex = REGIONAL_DESTINATIONS.map((name) => ({ name, key: normalize(name) }));

export function getRegionalSuggestions(query: string): string[] {
  const key = normalize(query);
  const words = key.split(" ");
  const matches: string[] = [];
  for (const destination of regionalSearchIndex) {
    if (words.every((word) => destination.key.includes(word))) matches.push(destination.name);
    if (matches.length === 8) break;
  }
  return matches;
}

type CalculatorEvent = "calculator_location_mode_select" | "calculator_result_view" | "calculator_lead_submit" | "calculator_whatsapp_open";
type CalculatorContext = { location_mode: LocationMode; property_type?: string; location_name?: string; surface_sqm?: number };

/** Never forward free text: even a location field may contain contact details. */
export function buildCalculatorAnalyticsPayload(context: CalculatorContext) {
  const location_mode = context.location_mode === "regional" ? "regional" : "local";
  const payload: Record<string, string | number> = { location_mode };
  if (PROPERTY_TYPES.some((type) => type.value === context.property_type)) payload.property_type = String(context.property_type);
  if (context.surface_sqm !== undefined && isValidPropertySurface(context.surface_sqm)) payload.surface_sqm = context.surface_sqm;
  if (context.location_name !== undefined) {
    const catalog: readonly string[] = location_mode === "regional" ? REGIONAL_DESTINATIONS : UNIFIED_ZONES.map((zone) => zone.label);
    payload.location_name = catalog.find((name) => normalize(name) === normalize(context.location_name ?? "")) ?? "other";
  }
  return payload;
}

export function trackCalculatorEvent(event: CalculatorEvent, context: CalculatorContext): void {
  if (typeof window === "undefined" || !hasAnalyticsConsent()) return;
  const payload = buildCalculatorAnalyticsPayload(context);
  try {
    // gtag already queues into dataLayer; don't push a duplicate GTM event.
    window.gtag?.("event", event, payload);
  } catch { /* Analytics must never interrupt the calculation. */ }
}

/** Lead din calculator, după salvare: eveniment distinct pe intenție, cu valoarea estimată (fără date personale). */
export function buildLeadCalculatorPayload(context: CalculatorContext & { intent: Intent; value: number }) {
  const payload: Record<string, string | number> = { ...buildCalculatorAnalyticsPayload(context), currency: "EUR", value: Math.max(0, Math.round(Number(context.value) || 0)) };
  if (INTENTS.some((i) => i.value === context.intent)) payload.intent = context.intent;
  return payload;
}

export function trackLeadCalculatorEvent(event: LeadCalculatorEvent, context: CalculatorContext & { intent: Intent; value: number }): void {
  if (typeof window === "undefined" || !hasAnalyticsConsent()) return;
  try {
    window.gtag?.("event", event, buildLeadCalculatorPayload(context));
  } catch { /* Analytics must never interrupt the calculation. */ }
}
