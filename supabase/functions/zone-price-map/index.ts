// zone-price-map — public, aggregated only: median sale €/m² per Timișoara district
// (scraper listings, last 180 days). No individual listings or contacts are returned.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
// Ordinea zonelor trebuie să rămână identică cu `get_zone_price_map()` (idx 0–7).
const ZONES = [
  { keys: ["cetate", "centru", "unirii", "victoriei"], label: "Centru / Cetate", lat: 45.7557, lng: 21.229 },
  { keys: ["elisabetin"], label: "Elisabetin", lat: 45.747, lng: 21.227 },
  { keys: ["iosefin"], label: "Iosefin", lat: 45.747, lng: 21.207 },
  { keys: ["fabric"], label: "Fabric", lat: 45.758, lng: 21.252 },
  { keys: ["complex stud", "circumval", "iulius", "lipovei", "torontal", "aradului", "bucovina", "ronat"], label: "Nord / Aradului", lat: 45.774, lng: 21.225 },
  { keys: ["dumbr"], label: "Dumbrăvița", lat: 45.796, lng: 21.242 },
  { keys: ["giroc", "martirilor", "soarelui", "judetean", "dambovi", "braytim", "sagului", "freidorf"], label: "Sud", lat: 45.727, lng: 21.238 },
  { keys: ["mosnita", "ghiroda", "sacalaz", "chisoda"], label: "Periurban", lat: 45.73, lng: 21.3 },
];

let cache: { at: number; body: string } | null = null;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (cache && Date.now() - cache.at < 3600_000) {
    return new Response(cache.body, { headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" } });
  }
  // Agregatele se calculează în baza de date (RPC public, doar mediane pe zonă cu ≥5 anunțuri);
  // funcția nu citește rânduri individuale și nu folosește acces privilegiat.
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { auth: { persistSession: false } });
  const { data: agg, error } = await sb.rpc("get_zone_price_map");
  if (error || !agg) return new Response(JSON.stringify({ error: "db_error" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  const a = agg as { city_ppm: number; sample: number; city_rent_ppm: number; zones: { idx: number; n: number; ppm: number | null; rent_n: number; rent_ppm: number }[] };
  const byIdx = new Map((a.zones ?? []).map((z) => [z.idx, z]));
  const body = JSON.stringify({
    ok: true,
    city_ppm: Number(a.city_ppm) || 0,
    sample: Number(a.sample) || 0,
    city_rent_ppm: Number(a.city_rent_ppm) || 9,
    hotel_yield_pct: 9.4,
    zones: ZONES.map((z, i) => {
      const row = byIdx.get(i);
      const ppm = row?.ppm == null ? null : Number(row.ppm);
      const rentPpm = Number(row?.rent_ppm ?? a.city_rent_ppm ?? 9);
      return {
        label: z.label, lat: z.lat, lng: z.lng, n: Number(row?.n ?? 0), ppm,
        rent_ppm: Math.round(rentPpm * 10) / 10, rent_n: Number(row?.rent_n ?? 0),
        // Randament net chirie lungă: 12 luni × 90% (gol/costuri) / preț pe m².
        classic_yield_pct: ppm ? Math.round(((rentPpm * 12 * 0.9) / ppm) * 1000) / 10 : null,
        hotel_yield_pct: 9.4,
      };
    }),
    updated_at: new Date().toISOString(),
  });
  cache = { at: Date.now(), body };
  return new Response(body, { headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" } });
});
