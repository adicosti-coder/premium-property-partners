// Cron edge function: aggregates scraper_leads + properties into voice_agent_knowledge_chunks
// Computes per-zone, per-listing-type market insights for Andrei.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const startedAt = Date.now();
  const chunks: Array<{
    content: string;
    metadata: Record<string, unknown>;
    tags: string[];
    zone: string | null;
    listing_type: string | null;
    source: string;
    confidence: number;
  }> = [];

  // ── 1. Aggregate scraper_leads by zone + listing_type ──
  const { data: leads, error: leadsErr } = await supabase
    .from("scraper_leads")
    .select("neighborhood_slug, listing_type, original_price, title, source, created_at")
    .gte("created_at", new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString())
    .not("neighborhood_slug", "is", null)
    .limit(2000);

  if (leadsErr) console.error("[sync-knowledge] leads err:", leadsErr.message);

  // Group: zone|listing_type → prices + sample titles
  const groups = new Map<string, { zone: string; type: string; prices: number[]; titles: string[]; sources: Set<string> }>();
  for (const l of leads || []) {
    const zone = (l as any).neighborhood_slug as string;
    const type = ((l as any).listing_type || "vanzare") as string;
    const price = Number((l as any).original_price || 0);
    if (!zone || price <= 0) continue;
    const key = `${zone}|${type}`;
    if (!groups.has(key)) groups.set(key, { zone, type, prices: [], titles: [], sources: new Set() });
    const g = groups.get(key)!;
    g.prices.push(price);
    if (g.titles.length < 3 && (l as any).title) g.titles.push((l as any).title);
    if ((l as any).source) g.sources.add((l as any).source);
  }

  for (const [, g] of groups) {
    if (g.prices.length < 3) continue; // need minimum signal
    const med = Math.round(median(g.prices));
    const min = Math.round(Math.min(...g.prices));
    const max = Math.round(Math.max(...g.prices));
    const zoneLabel = g.zone.replace(/-/g, " ");
    const typeLabel = g.type === "inchiriere" ? "închiriere" : g.type === "regim_hotelier" ? "regim hotelier" : "vânzare";
    const content = `Piața ${typeLabel} în zona ${zoneLabel} (Timișoara, ultimele 90 zile): preț median ${med.toLocaleString("ro-RO")} EUR, interval ${min.toLocaleString("ro-RO")}–${max.toLocaleString("ro-RO")} EUR pe ${g.prices.length} anunțuri analizate. Surse: ${[...g.sources].join(", ") || "OLX"}.`;
    chunks.push({
      content,
      metadata: {
        zone_slug: g.zone,
        listing_type: g.type,
        median_price_eur: med,
        min_price_eur: min,
        max_price_eur: max,
        sample_size: g.prices.length,
        sample_titles: g.titles,
      },
      tags: ["market_stat", g.zone, g.type, "timisoara"],
      zone: g.zone,
      listing_type: g.type,
      source: "scraper_leads_aggregate",
      confidence: Math.min(1, g.prices.length / 20),
    });
  }

  // ── 2. Aggregate properties (RealTrust portfolio) by zone ──
  const { data: props } = await supabase
    .from("properties")
    .select("zone, name, base_price, max_guests, bedrooms")
    .not("zone", "is", null)
    .limit(500);

  const propGroups = new Map<string, { zone: string; prices: number[]; names: string[] }>();
  for (const p of props || []) {
    const zone = (p as any).zone as string;
    const price = Number((p as any).base_price || 0);
    if (!zone || price <= 0) continue;
    if (!propGroups.has(zone)) propGroups.set(zone, { zone, prices: [], names: [] });
    const g = propGroups.get(zone)!;
    g.prices.push(price);
    if (g.names.length < 3 && (p as any).name) g.names.push((p as any).name);
  }

  for (const [, g] of propGroups) {
    const avg = Math.round(g.prices.reduce((s, v) => s + v, 0) / g.prices.length);
    const content = `Portofoliul RealTrust ApArt Hotel în ${g.zone}: ${g.prices.length} apartamente administrate în regim hotelier, tarif mediu ${avg} EUR/noapte. Exemple: ${g.names.join(", ")}.`;
    chunks.push({
      content,
      metadata: {
        zone_slug: g.zone,
        portfolio_size: g.prices.length,
        avg_nightly_eur: avg,
        sample_names: g.names,
      },
      tags: ["portfolio", g.zone, "regim_hotelier", "realtrust"],
      zone: g.zone,
      listing_type: "regim_hotelier",
      source: "properties_aggregate",
      confidence: 1,
    });
  }

  // ── 3. Replace knowledge base atomically ──
  const { error: delErr } = await supabase
    .from("voice_agent_knowledge_chunks")
    .delete()
    .in("source", ["scraper_leads_aggregate", "properties_aggregate"]);
  if (delErr) console.error("[sync-knowledge] delete err:", delErr.message);

  let inserted = 0;
  if (chunks.length) {
    const { error: insErr, count } = await supabase
      .from("voice_agent_knowledge_chunks")
      .insert(chunks, { count: "exact" });
    if (insErr) console.error("[sync-knowledge] insert err:", insErr.message);
    else inserted = count || chunks.length;
  }

  const ms = Date.now() - startedAt;
  console.log(`[sync-knowledge] done in ${ms}ms — ${inserted} chunks (${groups.size} market groups, ${propGroups.size} portfolio zones)`);

  return new Response(
    JSON.stringify({ ok: true, inserted, market_groups: groups.size, portfolio_zones: propGroups.size, ms }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
