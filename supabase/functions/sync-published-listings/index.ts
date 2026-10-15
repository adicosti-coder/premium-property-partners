// Ține la zi anunțurile publicate pe RealTrust din sursa originală (Storia, OLX,
// imobiliare.ro, Publi24 etc.): prețul se actualizează direct; dacă se schimbă
// pozele sau descrierea, anunțul este republicat (același link) prin worker.
// Nu dezactivează automat anunțurile — sursa indisponibilă doar se raportează.
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";
import { isUrlAllowed } from "../_shared/urlGuard.ts";
import { extractPrice, extractRent } from "../_shared/priceExtract.ts";
import { parseStoriaDetail } from "../_shared/storiaDetail.ts";
import { isImplausiblePrice, priceCategoryOf } from "../_shared/priceSanity.ts";
import { isValidPropertyImageUrl } from "../_shared/propertyImageFilter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret, x-webhook-secret",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const BUDGET_MS = 110_000;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";

const norm = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();

function genericImages(html: string): string[] {
  const out = new Set<string>();
  for (const m of html.matchAll(/<meta[^>]+property=["']og:image(?::url)?["'][^>]+content=["']([^"']+)["']/gi)) out.add(m[1]);
  return [...out].filter(isValidPropertyImageUrl);
}
function genericDescription(html: string): string | null {
  const m = html.match(/<meta[^>]+(?:name|property)=["'](?:og:)?description["'][^>]+content=["']([^"']+)["']/i);
  return m ? norm(m[1]) : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const denied = await requireInternalOrAdmin(req, corsHeaders);
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const dryRun = body?.dry_run === true;
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const started = Date.now();

  const { data: props, error } = await sb.from("properties")
    .select("id, slug, capital_necesar, migrated_from_prospect_id")
    .eq("is_active", true).not("migrated_from_prospect_id", "is", null).limit(100);
  if (error) return json({ error: error.message }, 500);

  const report: any[] = [];
  for (const p of props ?? []) {
    if (Date.now() - started > BUDGET_MS) break;
    const { data: pr } = await sb.from("prospect_listings")
      .select("id, source_url, price, currency, images, description, category, title")
      .eq("id", p.migrated_from_prospect_id).maybeSingle();
    const src = String(pr?.source_url ?? "");
    if (!pr || !src || !isUrlAllowed(src).ok) { report.push({ slug: p.slug, status: "no_source" }); continue; }

    let html = "";
    try {
      const r = await fetch(src, { headers: { "User-Agent": UA, "Accept-Language": "ro-RO,ro;q=0.9" }, signal: AbortSignal.timeout(12_000) });
      if (!r.ok) { report.push({ slug: p.slug, status: `source_http_${r.status}` }); continue; }
      html = await r.text();
    } catch { report.push({ slug: p.slug, status: "source_unreachable" }); continue; }

    const cat = priceCategoryOf({ category: pr.category, title: pr.title, url: src });
    const storia = /storia\.ro/.test(src) ? parseStoriaDetail(html) : null;
    let price = cat === "inchiriere" ? extractRent(html) : extractPrice(html);
    if (price != null && isImplausiblePrice(price, cat, "EUR")) price = null;
    const images = (storia?.images ?? genericImages(html)).filter(isValidPropertyImageUrl);
    const description = storia?.description ?? genericDescription(html);

    const oldImgs: string[] = Array.isArray(pr.images) ? pr.images : [];
    const priceChanged = price != null && Number(pr.price || 0) !== price;
    // Doar galerii complete (Storia) pot înlocui pozele; og:image singular nu.
    const imagesChanged = !!storia && images.length >= 3 && images.join("|") !== oldImgs.join("|");
    const descChanged = !!description && description.length >= 120 && norm(description) !== norm(pr.description);
    const entry: any = { slug: p.slug, status: "unchanged", price_old: pr.price, price_new: price, imagesChanged, descChanged };

    if (!dryRun && (priceChanged || imagesChanged || descChanged)) {
      const patch: Record<string, unknown> = { price_checked_at: new Date().toISOString() };
      if (priceChanged) patch.price = price;
      if (imagesChanged) patch.images = images;
      if (descChanged) patch.description = description;
      if (imagesChanged || descChanged) patch.enrichment_status = null; // forțează rescrierea din datele noi
      await sb.from("prospect_listings").update(patch).eq("id", pr.id);

      if (imagesChanged || descChanged) {
        const r = await fetch(`${url}/functions/v1/auto-publish-listing-worker`, {
          method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({ prospect_id: pr.id, triggered_by: "source_sync", republish: true }),
        }).catch(() => null);
        const rb = r ? await r.json().catch(() => ({})) : {};
        entry.status = rb?.published ? "republished" : `republish_failed:${rb?.reason ?? rb?.error ?? r?.status ?? "net"}`;
        if (!rb?.published && priceChanged) await sb.from("properties").update({ capital_necesar: price }).eq("id", p.id);
      } else {
        await sb.from("properties").update({ capital_necesar: price }).eq("id", p.id);
        entry.status = "price_updated";
      }
    } else if (!dryRun) {
      await sb.from("prospect_listings").update({ price_checked_at: new Date().toISOString() }).eq("id", pr.id);
    }
    report.push(entry);
  }

  if (!dryRun) {
    await sb.from("admin_audit_log").insert({
      action: "sync_published_listings", actor_label: body?.trigger ?? "admin", entity_type: "properties",
      severity: "info", details: { checked: report.length, report },
    });
  }
  return json({ ok: true, dry_run: dryRun, checked: report.length, report, duration_ms: Date.now() - started });
});
