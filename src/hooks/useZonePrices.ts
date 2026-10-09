import { useEffect, useState } from "react";
import { supabaseConfig, getSupabasePublishableKey } from "@/lib/supabaseClient";

export type ZonePrice = {
  label: string; lat: number; lng: number; n: number; ppm: number | null;
  rent_ppm: number; rent_n: number; classic_yield_pct: number | null; hotel_yield_pct: number;
};
export type ZonePriceData = { city_ppm: number; city_rent_ppm: number; sample: number; zones: ZonePrice[] };

let cached: Promise<ZonePriceData | null> | null = null;

/** Aggregated district medians from the public zone-price-map function (cached per page load). */
export function useZonePrices() {
  const [data, setData] = useState<ZonePriceData | null>(null);
  useEffect(() => {
    cached ??= fetch(`${supabaseConfig.url}/functions/v1/zone-price-map`, {
      headers: { apikey: getSupabasePublishableKey(), Authorization: `Bearer ${getSupabasePublishableKey()}` },
    }).then((r) => r.json()).then((d) => (d?.ok ? (d as ZonePriceData) : null)).catch(() => { cached = null; return null; });
    let alive = true;
    cached.then((d) => alive && setData(d));
    return () => { alive = false; };
  }, []);
  return data;
}
