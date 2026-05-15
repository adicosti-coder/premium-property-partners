// Detects 4 types of SEO opportunities from seo_gsc_daily, scores them by potential clicks,
// upserts into seo_opportunities. Runs daily via cron.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Expected CTR by SERP position (industry standard curve)
const EXPECTED_CTR: Record<number, number> = {
  1: 0.272, 2: 0.157, 3: 0.107, 4: 0.078, 5: 0.058, 6: 0.045, 7: 0.035, 8: 0.029, 9: 0.024, 10: 0.020,
};
const expectedCtrAt = (pos: number) => {
  const r = Math.round(pos);
  if (r <= 1) return EXPECTED_CTR[1];
  if (r >= 10) return EXPECTED_CTR[10];
  return EXPECTED_CTR[r] ?? 0.02;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // Window: last 28 days
    const end = new Date(); end.setUTCDate(end.getUTCDate() - 2);
    const start = new Date(end); start.setUTCDate(start.getUTCDate() - 28);
    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);

    // Aggregate per query+page
    const { data: rows, error } = await sb
      .from("seo_gsc_daily")
      .select("date, query, page, clicks, impressions, ctr, position")
      .gte("date", startStr)
      .lte("date", endStr)
      .limit(50000);
    if (error) return json({ error: error.message }, 500);
    if (!rows || rows.length === 0) return json({ success: true, message: "No GSC data yet — run gsc-daily-snapshot first.", opportunities: 0 });

    type Agg = { clicks: number; impressions: number; positionSum: number; n: number };
    const byQP = new Map<string, Agg>();
    const byQ = new Map<string, Agg>();
    const byPage = new Map<string, Agg>();
    const byQueryPages = new Map<string, Map<string, Agg>>();

    for (const r of rows) {
      const k = `${r.query}\t${r.page}`;
      const a = byQP.get(k) || { clicks: 0, impressions: 0, positionSum: 0, n: 0 };
      a.clicks += r.clicks; a.impressions += r.impressions; a.positionSum += Number(r.position) * r.impressions; a.n += r.impressions;
      byQP.set(k, a);

      const aq = byQ.get(r.query) || { clicks: 0, impressions: 0, positionSum: 0, n: 0 };
      aq.clicks += r.clicks; aq.impressions += r.impressions; aq.positionSum += Number(r.position) * r.impressions; aq.n += r.impressions;
      byQ.set(r.query, aq);

      const ap = byPage.get(r.page) || { clicks: 0, impressions: 0, positionSum: 0, n: 0 };
      ap.clicks += r.clicks; ap.impressions += r.impressions; ap.positionSum += Number(r.position) * r.impressions; ap.n += r.impressions;
      byPage.set(r.page, ap);

      if (!byQueryPages.has(r.query)) byQueryPages.set(r.query, new Map());
      const qp = byQueryPages.get(r.query)!;
      const aqp = qp.get(r.page) || { clicks: 0, impressions: 0, positionSum: 0, n: 0 };
      aqp.clicks += r.clicks; aqp.impressions += r.impressions; aqp.positionSum += Number(r.position) * r.impressions; aqp.n += r.impressions;
      qp.set(r.page, aqp);
    }

    const opportunities: any[] = [];

    // 1. Striking distance: position 4-15 + impressions >= 50
    for (const [k, a] of byQP) {
      if (a.impressions < 50) continue;
      const pos = a.n > 0 ? a.positionSum / a.n : 0;
      if (pos < 4 || pos > 15) continue;
      const [query, page] = k.split("\t");
      if (!query || !page) continue;
      // Potential: if reach pos 3 → expected CTR @ 3
      const targetCtr = expectedCtrAt(3);
      const potentialClicks = Math.max(0, Math.round(a.impressions * targetCtr - a.clicks));
      if (potentialClicks < 5) continue;
      opportunities.push({
        type: "striking_distance",
        query, page,
        current_position: Number(pos.toFixed(2)),
        current_clicks: a.clicks,
        current_impressions: a.impressions,
        current_ctr: a.impressions ? Number((a.clicks / a.impressions).toFixed(4)) : 0,
        potential_clicks: potentialClicks,
        score: potentialClicks * 10 + Math.round(a.impressions / 10),
        details: { reason: "Aproape de top 3 — push pentru ranking" },
      });
    }

    // 2. CTR underperformers: position <= 5, impressions >= 100, ctr < 50% of expected
    for (const [k, a] of byQP) {
      if (a.impressions < 100) continue;
      const pos = a.n > 0 ? a.positionSum / a.n : 0;
      if (pos < 1 || pos > 5) continue;
      const ctr = a.clicks / a.impressions;
      const expected = expectedCtrAt(pos);
      if (ctr >= expected * 0.5) continue;
      const [query, page] = k.split("\t");
      if (!query || !page) continue;
      const potentialClicks = Math.round(a.impressions * expected - a.clicks);
      if (potentialClicks < 5) continue;
      opportunities.push({
        type: "ctr_low",
        query, page,
        current_position: Number(pos.toFixed(2)),
        current_clicks: a.clicks,
        current_impressions: a.impressions,
        current_ctr: Number(ctr.toFixed(4)),
        potential_clicks: potentialClicks,
        score: potentialClicks * 12,
        details: { expected_ctr: Number(expected.toFixed(4)), reason: "Poziție bună dar CTR sub potențial — optimizează title/meta" },
      });
    }

    // 3. Decay: page clicks dropped >25% comparing last 7d vs prev 7d
    const last7 = new Date(end); last7.setUTCDate(last7.getUTCDate() - 7);
    const prev7 = new Date(last7); prev7.setUTCDate(prev7.getUTCDate() - 7);
    const last7Str = last7.toISOString().slice(0, 10);
    const prev7Str = prev7.toISOString().slice(0, 10);
    const recent = new Map<string, number>();
    const previous = new Map<string, number>();
    for (const r of rows) {
      if (!r.page) continue;
      if (r.date >= last7Str) recent.set(r.page, (recent.get(r.page) || 0) + r.clicks);
      else if (r.date >= prev7Str && r.date < last7Str) previous.set(r.page, (previous.get(r.page) || 0) + r.clicks);
    }
    for (const [page, prev] of previous) {
      if (prev < 10) continue;
      const cur = recent.get(page) || 0;
      const drop = (prev - cur) / prev;
      if (drop < 0.25) continue;
      opportunities.push({
        type: "decay",
        page,
        current_clicks: cur,
        potential_clicks: prev - cur,
        score: (prev - cur) * 15,
        details: { previous_clicks: prev, drop_pct: Math.round(drop * 100), window: "7d vs 7d" },
      });
    }

    // 4. Cannibalization: 2+ pages with >=50 impressions for same query
    for (const [query, pages] of byQueryPages) {
      const significant = [...pages.entries()].filter(([_p, a]) => a.impressions >= 50).map(([p, a]) => ({
        page: p, clicks: a.clicks, impressions: a.impressions,
        position: a.n > 0 ? Number((a.positionSum / a.n).toFixed(2)) : 0,
      }));
      if (significant.length < 2) continue;
      significant.sort((a, b) => b.clicks - a.clicks);
      const totalImp = significant.reduce((s, x) => s + x.impressions, 0);
      opportunities.push({
        type: "cannibalization",
        query,
        page: significant[0].page,
        pages: significant.slice(0, 5),
        current_impressions: totalImp,
        score: totalImp,
        details: { pages_count: significant.length, reason: "Multiple pagini concurează pentru același query — consolidează" },
      });
    }

    // Sort, keep top 100
    opportunities.sort((a, b) => b.score - a.score);
    const top = opportunities.slice(0, 100);

    // Mark old open opps as superseded then upsert
    await sb.from("seo_opportunities").delete().eq("status", "open").lte("created_at", new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString());
    let inserted = 0;
    for (const opp of top) {
      const { error: e } = await sb.from("seo_opportunities").upsert(opp, { onConflict: "type,query,page" }).select();
      if (!e) inserted++;
      else if (!String(e.message).includes("duplicate")) console.error("opp upsert", e);
    }

    return json({ success: true, total: opportunities.length, inserted, by_type: top.reduce((acc: any, o) => { acc[o.type] = (acc[o.type] || 0) + 1; return acc; }, {}) });
  } catch (e) {
    console.error("seo-opportunity-detector", e);
    return json({ error: (e as Error).message }, 500);
  }
});
