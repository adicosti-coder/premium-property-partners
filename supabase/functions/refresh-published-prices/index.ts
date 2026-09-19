// Verifică periodic prețurile anunțurilor deja publicate pe platforme, ca istoricul
// pe zonă să rămână actual. Reia paginile anunțurilor active (cele mai vechi verificate
// primele), extrage prețul și îl actualizează — triggerul de istoric înregistrează
// automat variația în prospect_price_history.
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";
import { isUrlAllowed } from "../_shared/urlGuard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret, x-webhook-secret",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const GLOBAL_BUDGET_MS = 45_000;
const PAGE_TIMEOUT_MS = 7_000;
const MIN_PRICE = 3_000;
const MAX_PRICE = 3_000_000;

/** Extrage prețul în EUR din HTML-ul anunțului (acceptă și RON, convertit aproximativ). */
function extractPrice(html: string): number | null {
  const text = html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");
  const candidates: number[] = [];

  const push = (raw: string, ron: boolean) => {
    const n = Number(raw.replace(/[.\s]/g, "").replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) return;
    const eurVal = ron ? Math.round(n / 4.97) : n;
    if (eurVal >= MIN_PRICE && eurVal <= MAX_PRICE) candidates.push(eurVal);
  };

  for (const m of text.matchAll(/([\d.\s]{4,12})\s*(?:€|EUR\b|euro\b)/gi)) push(m[1], false);
  for (const m of text.matchAll(/(?:€|EUR)\s*([\d.\s]{4,12})/gi)) push(m[1], false);
  for (const m of text.matchAll(/([\d.\s]{5,12})\s*(?:lei\b|RON\b)/gi)) push(m[1], true);

  if (!candidates.length) return null;
  // Prețul anunțului este de regulă cea mai mică valoare plauzibilă repetată în pagină.
  candidates.sort((a, b) => a - b);
  return candidates[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const denied = await requireInternalOrAdmin(req, corsHeaders);
  if (denied) return denied;

  const startedAt = Date.now();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  let limit = 40;
  try {
    const body = await req.json();
    if (body?.limit) limit = Math.min(120, Math.max(1, Number(body.limit)));
  } catch {
    // apel fără corp — se folosesc valorile implicite
  }

  const { data: listings, error } = await supabase
    .from("prospect_listings")
    .select("id,source_url,price,source_platform,price_checked_at")
    .eq("is_active", true)
    .not("source_url", "is", null)
    .or(
      `price_checked_at.is.null,price_checked_at.lt.${new Date(Date.now() - 12 * 3600_000).toISOString()}`,
    )
    .order("price_checked_at", { ascending: true, nullsFirst: true })
    .limit(limit);

  if (error) return json({ error: error.message }, 500);

  let checked = 0;
  let changed = 0;
  let unreachable = 0;
  let noPrice = 0;

  for (const row of listings || []) {
    if (Date.now() - startedAt > GLOBAL_BUDGET_MS) break;
    const url = String(row.source_url || "");
    if (!url || !isUrlAllowed(url).ok) continue;

    checked++;
    let html = "";
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; RealTrustPriceCheck/1.0)" },
        signal: AbortSignal.timeout(PAGE_TIMEOUT_MS),
      });
      if (!res.ok) {
        unreachable++;
        await supabase
          .from("prospect_listings")
          .update({ price_checked_at: new Date().toISOString() })
          .eq("id", row.id);
        continue;
      }
      html = await res.text();
    } catch {
      unreachable++;
      continue;
    }

    const price = extractPrice(html);
    const patch: Record<string, unknown> = { price_checked_at: new Date().toISOString() };
    if (price == null) {
      noPrice++;
    } else if (Number(row.price || 0) !== price) {
      patch.price = price;
      changed++;
    }

    await supabase.from("prospect_listings").update(patch).eq("id", row.id);
  }

  return json({
    ok: true,
    checked,
    price_changed: changed,
    unreachable,
    without_price: noPrice,
    duration_ms: Date.now() - startedAt,
  });
});
