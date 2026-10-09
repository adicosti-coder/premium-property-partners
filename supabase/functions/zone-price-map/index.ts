// zone-price-map — public, aggregated only: median sale €/m² per Timișoara district
// (scraper listings, last 180 days). No individual listings or contacts are returned.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
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
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const median = (a: number[]) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

let cache: { at: number; body: string } | null = null;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (cache && Date.now() - cache.at < 3600_000) {
    return new Response(cache.body, { headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" } });
  }
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const since = new Date(Date.now() - 180 * 86400_000).toISOString();
  const { data, error } = await sb.from("prospect_listings").select("zone, price, size").eq("category", "vanzare")
    .gte("created_at", since).gte("price", 20000).lte("price", 1500000).gte("size", 15).limit(3000);
  if (error) return new Response(JSON.stringify({ error: "db_error" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  const buckets: number[][] = ZONES.map(() => []);
  const all: number[] = [];
  for (const r of data ?? []) {
    const ppm = Number(r.price) / Number(r.size);
    if (!(ppm > 600 && ppm < 6000)) continue;
    all.push(ppm);
    const n = norm(r.zone || "");
    const i = ZONES.findIndex((z) => z.keys.some((k) => n.includes(k)));
    if (i >= 0) buckets[i].push(ppm);
  }
  const body = JSON.stringify({
    ok: true,
    city_ppm: Math.round(median(all)),
    sample: all.length,
    zones: ZONES.map((z, i) => ({ label: z.label, lat: z.lat, lng: z.lng, n: buckets[i].length, ppm: buckets[i].length >= 5 ? Math.round(median(buckets[i])) : null })),
    updated_at: new Date().toISOString(),
  });
  cache = { at: Date.now(), body };
  return new Response(body, { headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" } });
});
