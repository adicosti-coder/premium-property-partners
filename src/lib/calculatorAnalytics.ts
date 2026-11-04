import { hasAnalyticsConsent } from "./conversionTracking";
import { PROPERTY_TYPES } from "./ownerIncomeEstimate";
import { isValidPropertySurface, UNIFIED_ZONES, type LocationMode } from "./unifiedCalculator";

export const REGIONAL_DESTINATIONS = [
  "București", "Cluj-Napoca", "Brașov", "Sibiu", "Iași", "Constanța", "Oradea", "Arad", "Craiova",
  "Timișoara", "Galați", "Ploiești", "Pitești", "Bacău", "Baia Mare", "Târgu Mureș", "Suceava", "Alba Iulia",
  "Bistrița", "Deva", "Piatra Neamț", "Târgu Jiu", "Tulcea", "Satu Mare", "Buzău", "Râmnicu Vâlcea",
  "Poiana Brașov", "Sinaia", "Predeal", "Bușteni", "Azuga", "Bran", "Râșnov", "Vatra Dornei", "Borșa",
  "Mamaia", "Vama Veche", "Eforie Nord", "Eforie Sud", "Costinești", "Neptun", "Olimp", "Mangalia", "Năvodari",
  "Sovata", "Băile Felix", "Băile Herculane", "Călimănești", "Căciulata", "Băile Tușnad", "Murani",
] as const;

const normalize = (value: string) => value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("ro");

export function getRegionalSuggestions(query: string): string[] {
  const key = normalize(query);
  return REGIONAL_DESTINATIONS.filter((name) => normalize(name).includes(key)).slice(0, 8);
}

type CalculatorEvent = "calculator_location_mode_select" | "calculator_result_view" | "calculator_lead_submit";
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