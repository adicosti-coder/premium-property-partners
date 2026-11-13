/**
 * Valorile hoteliere de referință din `timisoara_market_indices` (alerta lunară de piață).
 * Nu sunt observate pe piață: vin din același motor ca și calculatorul (apartament 2 camere, 55 mp,
 * finisaj standard, fără bife), la ocuparea implicită și comisionul 15–20% din venitul net.
 */
import { computeUnified, UNIFIED_ZONES, type UnifiedZoneValue } from "./unifiedCalculator";

export const HOTEL_INDEX_REFERENCE = { type: "2-camere", surface: 55, finish: "standard" } as const;
export const HOTEL_INDEX_SOURCE = "Grila calculatorului RealTrust · 2 camere, 55 mp, finisaj standard, ocupare implicită, comision 15–20% din net";

export interface HotelIndexValues {
  nightly_rate_eur: number;
  hotel_occupancy: number;
  hotel_net_min_eur_month: number;
  hotel_net_max_eur_month: number;
}

export function hotelIndexValues(zone: UnifiedZoneValue): HotelIndexValues {
  const r = computeUnified({ ...HOTEL_INDEX_REFERENCE, zone, parking: false });
  return {
    nightly_rate_eur: r.nightlyRate,
    hotel_occupancy: r.occupancy,
    hotel_net_min_eur_month: r.netMin,
    hotel_net_max_eur_month: r.netMax,
  };
}

/** SQL de actualizare pentru seed (rulat după schimbări în grila calculatorului). */
export function hotelIndexSeedSql(): string {
  const rows = UNIFIED_ZONES.map((z) => {
    const v = hotelIndexValues(z.value);
    return `  ('${z.value}', ${v.nightly_rate_eur}, ${v.hotel_occupancy}, ${v.hotel_net_min_eur_month}, ${v.hotel_net_max_eur_month})`;
  });
  return [
    "UPDATE public.timisoara_market_indices AS mi SET",
    "  nightly_rate_eur = v.nightly, hotel_occupancy = v.occ,",
    "  hotel_net_min_eur_month = v.net_min, hotel_net_max_eur_month = v.net_max,",
    `  hotel_source = '${HOTEL_INDEX_SOURCE}', updated_at = now()`,
    "FROM (VALUES",
    rows.join(",\n"),
    ") AS v(zone_key, nightly, occ, net_min, net_max)",
    "WHERE mi.zone_key = v.zone_key AND mi.rooms = 0;",
  ].join("\n");
}
