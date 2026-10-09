// analyzed-listing — cache + history for /analiza-anunt.
// action "lookup": returns a saved analysis of the same URL from the last 48h.
// action "save": stores a new analysis and emits an admin event (Make webhook).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rateLimiter.ts";
import { relayToMake } from "../_shared/makeRelay.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const URL_RE = /^https:\/\/(www\.)?[^/\s]*(storia|olx|publi24|imobiliare)\.ro\//i;
const CACHE_HOURS = 48;

const normUrl = (raw: string) => {
  try {
    const u = new URL(raw.trim());
    u.hash = "";
    for (const k of [...u.searchParams.keys()]) if (/^(utm_|fbclid|gclid)/i.test(k)) u.searchParams.delete(k);
    return u.toString().replace(/\/$/, "");
  } catch {
    return raw.trim();
  }
};
const str = (v: unknown, n: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, n) : null);
const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : null);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  if (!checkRateLimit(`analyzed-listing:${ip}`, { maxRequests: 60, windowMs: 3600_000 }).allowed) {
    return json({ error: "rate_limited" }, 429);
  }

  const body = await req.json().catch(() => ({}));
  const rawUrl = String(body?.url || "").slice(0, 500);
  if (!URL_RE.test(rawUrl)) return json({ error: "invalid_url" }, 400);
  const url = normUrl(rawUrl);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  if (body?.action === "lookup") {
    const since = new Date(Date.now() - CACHE_HOURS * 3600_000).toISOString();
    const { data } = await sb.from("analyzed_listings")
      .select("extracted_data, market_result, created_at")
      .eq("url", url).gte("created_at", since)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!data) return json({ ok: true, hit: false });
    return json({ ok: true, hit: true, analysis: data.extracted_data, market: data.market_result, created_at: data.created_at });
  }

  if (body?.action === "pdf") {
    const { data: last } = await sb.from("analyzed_listings").select("id, pdf_downloads")
      .eq("url", url).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!last) return json({ ok: true, tracked: false });
    await sb.from("analyzed_listings").update({ pdf_downloads: (last.pdf_downloads ?? 0) + 1, pdf_downloaded_at: new Date().toISOString() }).eq("id", last.id);
    return json({ ok: true, tracked: true });
  }

  if (body?.action !== "save") return json({ error: "invalid_action" }, 400);
  const a = (body?.analysis && typeof body.analysis === "object") ? body.analysis as Record<string, unknown> : {};
  const m = (body?.market && typeof body.market === "object") ? body.market as Record<string, unknown> : null;
  const images = Array.isArray(a.imagini) ? (a.imagini as unknown[]).filter((x) => typeof x === "string").slice(0, 20) : [];
  const extracted = { ...a, titlu: str(a.titlu, 200), pret_listare: num(a.pret_listare), suprafata: num(a.suprafata), zona: str(a.zona, 120), camere: num(a.camere), imagini: images };
  const score = m?.ok ? Math.max(0, Math.min(100, Math.round(Number(m.total_score) || 0))) : null;
  const negotiation = m?.ok ? { target_low: num(m.target_low), target_high: num(m.target_high), negotiation_eur: num(m.negotiation_eur) } : {};
  const phone = str(body?.phone, 30);

  const bare = url.replace(/^https:\/\/www\./, "https://");
  const { data: prospect } = await sb.from("prospect_listings").select("id")
    .in("source_url", [url, bare, bare.replace("https://", "https://www.")]).limit(1).maybeSingle();
  const channel = body?.channel === "whatsapp" ? "whatsapp" : "web";
  const { data: row, error } = await sb.from("analyzed_listings").insert({
    url, phone_number: phone, channel, prospect_listing_id: prospect?.id ?? null, extracted_data: extracted, calculated_score: score,
    negotiation_range: negotiation, market_result: m,
  }).select("id, created_at").maybeSingle();
  if (error) return json({ error: "db_error" }, 500);

  // Admin event: Make webhook (DLQ retry). Lead alerts for phones go through submit-lead.
  relayToMake("analyzed_listing.created", {
    id: row?.id, url, phone_number: phone, has_phone: !!phone,
    title: extracted.titlu, price: extracted.pret_listare, size: extracted.suprafata, zone: extracted.zona,
    calculated_score: score, ...negotiation, created_at: row?.created_at,
  }, sb).catch((e) => console.warn("relay failed", (e as Error).message));

  return json({ ok: true, id: row?.id });
});
