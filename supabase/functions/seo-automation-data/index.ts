// Aggregator for the admin dashboard tabs: returns opportunities, audits, competitor rankings,
// and 90-day trend in one call. Auth: admin only.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const auth = req.headers.get("Authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Missing auth" }, 401);
    const { data: u } = await sb.auth.getUser(token);
    if (!u?.user) return json({ error: "Invalid token" }, 401);
    const { data: role } = await sb.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
    if (!role) return json({ error: "Forbidden" }, 403);

    // Opportunities (open, top 50)
    const { data: opportunities } = await sb
      .from("seo_opportunities")
      .select("*")
      .eq("status", "open")
      .order("score", { ascending: false })
      .limit(50);

    // Audits (sorted worst first)
    const { data: audits } = await sb
      .from("seo_page_audits")
      .select("*")
      .order("health_score", { ascending: true })
      .limit(50);

    // Competitor rankings: latest date per query × domain
    const { data: latestComp } = await sb
      .from("seo_competitor_rankings")
      .select("*")
      .order("date", { ascending: false })
      .limit(2000);
    const compByQD = new Map<string, any>();
    for (const r of latestComp || []) {
      const key = `${r.query}|${r.domain}`;
      if (!compByQD.has(key)) compByQD.set(key, r);
    }
    // Build query → domains matrix
    const compMatrix: Record<string, Record<string, { position: number | null; url: string | null; title: string | null; date: string }>> = {};
    for (const r of compByQD.values()) {
      compMatrix[r.query] ||= {};
      compMatrix[r.query][r.domain] = { position: r.position, url: r.url, title: r.title, date: r.date };
    }

    // 90-day trend (aggregated)
    const end = new Date(); end.setUTCDate(end.getUTCDate() - 2);
    const start = new Date(end); start.setUTCDate(start.getUTCDate() - 90);
    const { data: histRows } = await sb
      .from("seo_gsc_daily")
      .select("date, clicks, impressions")
      .gte("date", start.toISOString().slice(0, 10))
      .lte("date", end.toISOString().slice(0, 10))
      .limit(50000);
    const trendMap = new Map<string, { clicks: number; impressions: number }>();
    for (const r of histRows || []) {
      const t = trendMap.get(r.date) || { clicks: 0, impressions: 0 };
      t.clicks += r.clicks; t.impressions += r.impressions;
      trendMap.set(r.date, t);
    }
    const trend90 = [...trendMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, v]) => ({ date, clicks: v.clicks, impressions: v.impressions, ctr: v.impressions ? Number((v.clicks / v.impressions * 100).toFixed(2)) : 0 }));

    // Andrei × SEO bridges (last 30d)
    const since30 = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const { data: bridges } = await sb
      .from("seo_andrei_bridge")
      .select("id, opportunity_id, prospect_id, query, page, matched_keywords, score_before, score_after, status, call_session_id, triggered_at, auto_dial_response")
      .gte("triggered_at", since30)
      .order("triggered_at", { ascending: false })
      .limit(100);

    // Enrich with prospect + call session info
    const prospectIds = [...new Set((bridges || []).map((b: any) => b.prospect_id).filter(Boolean))];
    const sessionIds = [...new Set((bridges || []).map((b: any) => b.call_session_id).filter(Boolean))];
    const [{ data: prospectsInfo }, { data: sessionsInfo }] = await Promise.all([
      prospectIds.length
        ? sb.from("prospect_listings").select("id, title, phone_normalized, location, lifecycle_status").in("id", prospectIds)
        : Promise.resolve({ data: [] }),
      sessionIds.length
        ? sb.from("voice_call_sessions").select("id, status, call_objective, started_at, ended_at, duration_seconds, outcome_summary, recording_url").in("id", sessionIds)
        : Promise.resolve({ data: [] }),
    ]);
    const prospectMap = new Map((prospectsInfo || []).map((p: any) => [p.id, p]));
    const sessionMap = new Map((sessionsInfo || []).map((s: any) => [s.id, s]));
    const bridgesEnriched = (bridges || []).map((b: any) => ({
      ...b,
      prospect: prospectMap.get(b.prospect_id) || null,
      call_session: b.call_session_id ? sessionMap.get(b.call_session_id) || null : null,
    }));
    const bridgeStats = {
      total_30d: bridges?.length || 0,
      called: bridgesEnriched.filter((b: any) => b.status === "called").length,
      skipped: bridgesEnriched.filter((b: any) => b.status === "skipped").length,
      failed: bridgesEnriched.filter((b: any) => b.status === "failed").length,
    };

    // Stats
    const oppByType = (opportunities || []).reduce((acc: any, o: any) => { acc[o.type] = (acc[o.type] || 0) + 1; return acc; }, {});
    const oppPotential = (opportunities || []).reduce((s: number, o: any) => s + (o.potential_clicks || 0), 0);
    const auditAvgScore = audits && audits.length ? Math.round(audits.reduce((s: number, a: any) => s + (a.health_score || 0), 0) / audits.length) : 0;
    const auditHighIssues = (audits || []).reduce((s: number, a: any) => s + ((a.issues || []).filter((i: any) => i.severity === "high").length), 0);

    return json({
      success: true,
      opportunities: opportunities || [],
      audits: audits || [],
      competitor_matrix: compMatrix,
      trend_90d: trend90,
      andrei_bridges: bridgesEnriched,
      stats: {
        opp_total: opportunities?.length || 0,
        opp_by_type: oppByType,
        opp_potential_clicks: oppPotential,
        audit_total: audits?.length || 0,
        audit_avg_score: auditAvgScore,
        audit_high_issues: auditHighIssues,
        comp_queries_tracked: Object.keys(compMatrix).length,
        bridge_stats: bridgeStats,
      },
    });
  } catch (e) {
    console.error("seo-automation-data", e);
    return json({ error: (e as Error).message }, 500);
  }
});
