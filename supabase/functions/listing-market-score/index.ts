// Public, deterministic market scoring for /analiza-anunt and the WhatsApp bot.
// Zone quality, rental demand and transport are computed from real data:
// scraper sale/rent listings (last 180 days), distance from Piața Victoriei
// and POIs stored in points_of_interest. Every call is logged for Admin → Analize.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rateLimiter.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

// Approximate district reference points (WGS84) used for transport/centrality.
const ZONES: Array<{ keys: string[]; label: string; lat: number; lng: number }> = [
  { keys: ["cetate", "centru", "unirii", "victoriei"], label: "Centru / Cetate", lat: 45.7557, lng: 21.2290 },
  { keys: ["elisabetin"], label: "Elisabetin", lat: 45.7470, lng: 21.2270 },
  { keys: ["iosefin"], label: "Iosefin", lat: 45.7470, lng: 21.2070 },
  { keys: ["fabric"], label: "Fabric", lat: 45.7580, lng: 21.2520 },
  { keys: ["complex stud", "circumval", "iulius", "lipovei", "torontal", "aradului", "bucovina", "ronat"], label: "Nord / Aradului", lat: 45.7740, lng: 21.2250 },
  { keys: ["dumbr"], label: "Dumbrăvița", lat: 45.7960, lng: 21.2420 },
  { keys: ["giroc", "martirilor", "soarelui", "judetean", "dambovi", "braytim", "sagului", "freidorf"], label: "Sud", lat: 45.7270, lng: 21.2380 },
  { keys: ["mosnita", "ghiroda", "sacalaz", "chisoda"], label: "Periurban", lat: 45.7300, lng: 21.3000 },
];
const CENTER = { lat: 45.7537, lng: 21.2246 };

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const clamp = (n: number, a = 0, b = 100) => Math.max(a, Math.min(b, Math.round(n)));
const round500 = (n: number) => Math.round(n / 500) * 500;
const km = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) =>
  Math.hypot((a.lat - b.lat) * 111, (a.lng - b.lng) * 111 * Math.cos((a.lat * Math.PI) / 180));
const median = (a: number[]) => {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (!checkRateLimit(`listing-market-score:${ip}`, { maxRequests: 30, windowMs: 3600_000 }).allowed) {
    return json({ error: "rate_limited", message: "Prea multe analize. Încearcă într-o oră." }, 429);
  }

  const body = await req.json().catch(() => ({}));
  const price = Number(body?.price) || 0;
  const size = Number(body?.size) || 0;
  const rooms = Math.max(1, Math.min(6, Number(body?.rooms) || 2));
  const zoneRaw = String(body?.zone || "").slice(0, 80);
  if (price < 10_000 || price > 3_000_000 || size < 15 || size > 500) {
    return json({ error: "invalid_input", message: "Preț sau suprafață lipsă din anunț." }, 400);
  }

  const zn = norm(zoneRaw);
  const zone = ZONES.find((z) => z.keys.some((k) => zn.includes(k)));
  const keys = zone?.keys ?? [];

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const since = new Date(Date.now() - 180 * 86400_000).toISOString();
  const [{ data: sale, error }, { data: rent }, { data: pois }] = await Promise.all([
    sb.from("prospect_listings").select("zone, price, size, rooms, created_at").eq("category", "vanzare")
      .gte("created_at", since).gte("price", 20_000).lte("price", 1_500_000).gte("size", 15).limit(3000),
    sb.from("prospect_listings").select("zone, price, size").eq("category", "inchiriere")
      .gte("created_at", since).gte("price", 150).lte("price", 5000).gte("size", 15).limit(2000),
    sb.from("points_of_interest").select("category, latitude, longitude").not("latitude", "is", null).limit(1000),
  ]);
  if (error) return json({ error: "db_error" }, 500);

  const inZone = (z: string) => keys.some((k) => z.includes(k));
  const saleRows = (sale ?? []).map((r: any) => ({ z: norm(r.zone || ""), ppm: Number(r.price) / Number(r.size), rooms: Number(r.rooms) || null, price: Number(r.price), size: Number(r.size), at: String(r.created_at || "") }))
    .filter((r) => r.ppm > 600 && r.ppm < 6000);
  const rentRows = (rent ?? []).map((r: any) => ({ z: norm(r.zone || ""), ppm: Number(r.price) / Number(r.size) }))
    .filter((r) => r.ppm > 3 && r.ppm < 40);

  const zoneSale = keys.length ? saleRows.filter((r) => inZone(r.z)) : [];
  const pool = zoneSale.length >= 5 ? zoneSale : saleRows;
  const scope = zoneSale.length >= 5 ? "zona" : "oras";
  const similar = pool.filter((r) => r.rooms === rooms);
  const cityPpm = median(saleRows.map((r) => r.ppm)) || 2000;
  const medPpm = median((similar.length >= 5 ? similar : pool).map((r) => r.ppm)) || cityPpm;
  const askPpm = price / size;
  const diff = (askPpm - medPpm) / medPpm;

  // Calitatea zonei: prețul pieței în zonă vs. media orașului (piața „votează” calitatea).
  const zoneMedPpm = zoneSale.length >= 5 ? median(zoneSale.map((r) => r.ppm)) : cityPpm;
  const quality = clamp(70 + ((zoneMedPpm - cityPpm) / cityPpm) * 120);

  // Transport: distanța reală până în centru + POI de transport/servicii în raza de 1,5 km.
  const point = zone ? { lat: zone.lat, lng: zone.lng } : null;
  const distKm = point ? km(point, CENTER) : 3.5;
  const near = point ? (pois ?? []).filter((p: any) => km(point, { lat: Number(p.latitude), lng: Number(p.longitude) }) <= 1.5) : [];
  const nearTransport = near.filter((p: any) => ["transport", "shopping", "health", "services"].includes(p.category)).length;
  const transport = clamp(100 - distKm * 9 + Math.min(nearTransport, 6) * 2);

  // Cerere de închiriere: volumul anunțurilor de închiriere din zonă + chiria/m².
  const zoneRent = keys.length ? rentRows.filter((r) => inZone(r.z)) : [];
  const cityRentPpm = median(rentRows.map((r) => r.ppm)) || 9;
  const rentPpm = zoneRent.length >= 5 ? median(zoneRent.map((r) => r.ppm)) : cityRentPpm;
  const rentShare = rentRows.length ? zoneRent.length / rentRows.length : 0;
  const rentalDemand = clamp(55 + Math.min(rentShare * 200, 25) + ((rentPpm - cityRentPpm) / cityRentPpm) * 60 + (rooms <= 2 ? 5 : -5));

  const pricePosition = clamp(60 - diff * 200);
  const liquidity = clamp(45 + Math.min(similar.length, 40) * 0.8 + (rooms === 2 ? 15 : rooms <= 3 ? 8 : 0) - Math.max(0, diff) * 60);
  const scores = { lichiditate: liquidity, cerere_inchiriere: rentalDemand, calitate_zona: quality, transport, pret_mp: pricePosition };
  const total = clamp(liquidity * 0.2 + rentalDemand * 0.2 + quality * 0.2 + transport * 0.15 + pricePosition * 0.25);

  const marginPct = Math.min(0.12, 0.03 + Math.max(0, diff) * 0.5);
  const targetMid = price * (1 - marginPct);
  const targetLow = round500(targetMid * 0.985);
  const targetHigh = round500(Math.min(price, targetMid * 1.01));
  const negotiation = round500(price - (targetLow + targetHigh) / 2);

  const classicRent = Math.round((size * rentPpm) / 10) * 10;
  const classicNetYear = Math.round(classicRent * 12 * 0.9);
  const hotelNetYearMin = Math.round(price * 0.065);
  const hotelNetYearMax = Math.round(price * 0.094);

  // Distribuția prețurilor/m² din comparabile (anonimizat: fără linkuri, poze sau contacte).
  const sorted = pool.map((r) => r.ppm).sort((a, b) => a - b);
  const q = (p: number) => sorted.length ? Math.round(sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]) : 0;
  const lo = Math.floor(Math.min(q(0.05), askPpm) / 250) * 250, hi = Math.ceil(Math.max(q(0.95), askPpm) / 250) * 250;
  const histogram: Array<{ from: number; to: number; count: number }> = [];
  for (let b = lo; b < hi && histogram.length < 16; b += 250) {
    histogram.push({ from: b, to: b + 250, count: sorted.filter((v) => v >= b && v < b + 250).length });
  }
  const sample = (similar.length >= 3 ? similar : pool)
    .slice().sort((a, b) => Math.abs(a.ppm - askPpm) - Math.abs(b.ppm - askPpm)).slice(0, 8)
    .map((r) => ({ rooms: r.rooms, size: Math.round(r.size), price: Math.round(r.price), ppm: Math.round(r.ppm) }));
  const monthly: Record<string, number[]> = {};
  for (const r of pool) { const m = r.at.slice(0, 7); if (m) (monthly[m] ??= []).push(r.ppm); }
  const trend = Object.keys(monthly).sort().slice(-6).map((m) => ({ month: m, median_ppm: Math.round(median(monthly[m])), count: monthly[m].length }));
  const grossYieldPct = Math.round(((classicRent * 12) / price) * 1000) / 10;
  const finance = {
    gross_yield_pct: grossYieldPct,
    price_to_rent_years: classicRent ? Math.round((price / (classicRent * 12)) * 10) / 10 : null,
    payback_classic_years: classicNetYear ? Math.round((price / classicNetYear) * 10) / 10 : null,
    payback_hotel_years_min: Math.round((price / hotelNetYearMax) * 10) / 10,
    payback_hotel_years_max: Math.round((price / hotelNetYearMin) * 10) / 10,
    fair_value_eur: round500(medPpm * size),
  };

  const result = {
    ok: true,
    p25_ppm: q(0.25), p75_ppm: q(0.75), histogram, sample, trend, finance,
    zone_label: zone?.label ?? "Timișoara",
    scope,
    comparables: pool.length,
    similar_rooms: similar.length,
    rent_comparables: zoneRent.length >= 5 ? zoneRent.length : rentRows.length,
    distance_center_km: Math.round(distKm * 10) / 10,
    median_ppm: Math.round(medPpm),
    asking_ppm: Math.round(askPpm),
    diff_pct: Math.round(diff * 1000) / 10,
    total_score: total,
    scores,
    negotiation_eur: negotiation,
    target_low: targetLow,
    target_high: targetHigh,
    classic_rent_month: classicRent,
    classic_yield_pct: Math.round((classicNetYear / price) * 1000) / 10,
    hotel_net_month_min: Math.round(hotelNetYearMin / 12),
    hotel_net_month_max: Math.round(hotelNetYearMax / 12),
    hotel_yield_pct: "6,5–9,4",
  };

  const channel = body?.channel === "whatsapp" ? "whatsapp" : "web";
  await sb.from("listing_market_analyses").insert({
    channel,
    phone: typeof body?.phone === "string" ? body.phone.slice(0, 30) : null,
    source_url: typeof body?.source_url === "string" ? body.source_url.slice(0, 500) : null,
    title: typeof body?.title === "string" ? body.title.slice(0, 200) : null,
    zone: zoneRaw || null, rooms, size, price,
    total_score: total, negotiation_eur: negotiation, target_low: targetLow, target_high: targetHigh,
    result,
  }).then(({ error: e }) => e && console.warn("log insert failed", e.message));

  return json(result);
});
