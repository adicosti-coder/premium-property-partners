// Public, deterministic market scoring for /analiza-anunt.
// Input: zone, rooms, size, price (EUR). Compares with comparable listings
// collected by the scraper (prospect_listings, last 180 days) and returns
// a 0–100 score, negotiation margin, target price and hotel-regime comparison.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rateLimiter.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

// Qualitative zone profile (0–100): quality, transport, rental demand.
const ZONES: Array<{ keys: string[]; label: string; q: number; t: number; r: number }> = [
  { keys: ["cetate", "centru", "unirii", "victoriei"], label: "Centru / Cetate", q: 90, t: 92, r: 95 },
  { keys: ["iosefin"], label: "Iosefin", q: 78, t: 85, r: 82 },
  { keys: ["fabric"], label: "Fabric", q: 76, t: 82, r: 80 },
  { keys: ["circumval", "iulius", "torontal", "lipovei", "complex stud", "aradului"], label: "Nord / Aradului", q: 80, t: 85, r: 85 },
  { keys: ["dumbr"], label: "Dumbrăvița", q: 82, t: 55, r: 58 },
  { keys: ["giroc", "martirilor", "soarelui", "dâmbovi", "dambovi", "braytim", "sagului", "șagului"], label: "Sud", q: 70, t: 72, r: 68 },
];
const DEFAULT_ZONE = { label: "Timișoara", q: 70, t: 70, r: 70 };

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const clamp = (n: number, a = 0, b = 100) => Math.max(a, Math.min(b, Math.round(n)));
const round500 = (n: number) => Math.round(n / 500) * 500;
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
  if (!checkRateLimit(`listing-market-score:${ip}`, { maxRequests: 20, windowMs: 3600_000 }).allowed) {
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
  const profile = ZONES.find((z) => z.keys.some((k) => zn.includes(norm(k)))) ?? DEFAULT_ZONE;

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const since = new Date(Date.now() - 180 * 86400_000).toISOString();
  const { data, error } = await sb
    .from("prospect_listings")
    .select("zone, price, size, rooms")
    .gte("created_at", since)
    .gte("price", 20_000)
    .lte("price", 1_500_000)
    .gte("size", 15)
    .limit(2000);
  if (error) return json({ error: "db_error" }, 500);

  const rows = (data ?? []).map((r: any) => ({ z: norm(r.zone || ""), ppm: Number(r.price) / Number(r.size), rooms: Number(r.rooms) || null }))
    .filter((r) => r.ppm > 600 && r.ppm < 6000);
  const keys = "keys" in profile ? (profile as any).keys.map(norm) : [];
  const zoneRows = keys.length ? rows.filter((r) => keys.some((k: string) => r.z.includes(k))) : [];
  const pool = zoneRows.length >= 5 ? zoneRows : rows;
  const scope = zoneRows.length >= 5 ? "zona" : "oras";
  const similar = pool.filter((r) => r.rooms === rooms);
  const medPpm = median((similar.length >= 5 ? similar : pool).map((r) => r.ppm)) || 2000;
  const askPpm = price / size;
  const diff = (askPpm - medPpm) / medPpm; // + = above market

  const pricePosition = clamp(60 - diff * 200);
  const liquidity = clamp(45 + Math.min(similar.length, 40) * 0.8 + (rooms === 2 ? 15 : rooms <= 3 ? 8 : 0) - Math.max(0, diff) * 60);
  const rentalDemand = clamp(profile.r + (rooms <= 2 ? 5 : -5));
  const scores = {
    lichiditate: liquidity,
    cerere_inchiriere: rentalDemand,
    calitate_zona: profile.q,
    transport: profile.t,
    pret_mp: pricePosition,
  };
  const total = clamp(liquidity * 0.2 + rentalDemand * 0.2 + profile.q * 0.2 + profile.t * 0.15 + pricePosition * 0.25);

  // Negotiation: base 3% margin + half of the over-market premium (capped 12%).
  const marginPct = Math.min(0.12, 0.03 + Math.max(0, diff) * 0.5);
  const targetMid = price * (1 - marginPct);
  const targetLow = round500(targetMid * 0.985);
  const targetHigh = round500(Math.min(price, targetMid * 1.01));
  const negotiation = round500(price - (targetLow + targetHigh) / 2);

  // Hotel vs classic rent (EUR/month).
  const classicRent = Math.round((size * (scope === "zona" && profile.r > 80 ? 10 : 9)) / 10) * 10;
  const classicNetYear = Math.round(classicRent * 12 * 0.9);
  const hotelNetYear = Math.round(price * 0.094);

  return json({
    ok: true,
    zone_label: profile.label,
    scope,
    comparables: pool.length,
    similar_rooms: similar.length,
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
    hotel_net_month: Math.round(hotelNetYear / 12),
    hotel_yield_pct: 9.4,
  });
});
