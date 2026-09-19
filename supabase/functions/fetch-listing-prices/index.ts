// Preia prețul exact direct de pe paginile reale ale anunțurilor (OLX, Storia, imobiliare.ro,
// Publi24, BursaImobiliara) pentru linkurile trimise de interfața „Caută anunțuri de la proprietari".
// Actualizează și prospect_listings când linkul este deja salvat, ca rapoartele să rămână corecte.
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";
import { isUrlAllowed } from "../_shared/urlGuard.ts";
import { extractPrice, extractRent } from "../_shared/priceExtract.ts";

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

const GLOBAL_BUDGET_MS = 25_000;
const PAGE_TIMEOUT_MS = 6_000;
const MAX_URLS = 12;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const denied = await requireInternalOrAdmin(req, corsHeaders);
  if (denied) return denied;

  let urls: string[] = [];
  try {
    const body = await req.json();
    if (Array.isArray(body?.urls)) {
      urls = body.urls.filter((u: unknown) => typeof u === "string" && u.length > 10).slice(0, MAX_URLS);
    }
  } catch {
    return json({ error: "Corp invalid: se așteaptă { urls: string[] }" }, 400);
  }
  if (!urls.length) return json({ error: "Trimite cel puțin un link de anunț" }, 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const startedAt = Date.now();
  const prices: Record<string, { price: number | null; rent: number | null; ok: boolean }> = {};

  for (const url of urls) {
    if (Date.now() - startedAt > GLOBAL_BUDGET_MS) break;
    if (!isUrlAllowed(url).ok) {
      prices[url] = { price: null, rent: null, ok: false };
      continue;
    }
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; RealTrustPriceCheck/1.0)" },
        signal: AbortSignal.timeout(PAGE_TIMEOUT_MS),
      });
      if (!res.ok) {
        prices[url] = { price: null, rent: null, ok: false };
        continue;
      }
      const html = await res.text();
      const price = extractPrice(html);
      const rent = price == null ? extractRent(html) : null;
      prices[url] = { price, rent, ok: true };

      if (price != null) {
        await supabase
          .from("prospect_listings")
          .update({ price, price_checked_at: new Date().toISOString() })
          .eq("source_url", url);
      }
    } catch {
      prices[url] = { price: null, rent: null, ok: false };
    }
  }

  return json({ ok: true, prices, duration_ms: Date.now() - startedAt });
});
