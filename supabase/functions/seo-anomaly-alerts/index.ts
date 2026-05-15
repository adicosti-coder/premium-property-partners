// Detects sudden anomalies (drop >30% on important page, deindex, competitor leapfrog),
// emails admin via Resend, dedups via seo_anomaly_log.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const REPORT_EMAIL = Deno.env.get("ADMIN_ALERT_EMAIL") || "adicosti@gmail.com";
const FROM = "RealTrust SEO <info@notify.realtrust.ro>";
const DROP_THRESHOLD = 0.30;
const MIN_PREV_CLICKS = 10;
const DEDUP_HOURS = 24;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) return json({ error: "RESEND_API_KEY missing" }, 503);
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    const end = new Date(); end.setUTCDate(end.getUTCDate() - 2);
    const last7 = new Date(end); last7.setUTCDate(last7.getUTCDate() - 7);
    const prev7 = new Date(last7); prev7.setUTCDate(prev7.getUTCDate() - 7);

    const { data: rows } = await sb
      .from("seo_gsc_daily")
      .select("date, page, clicks")
      .gte("date", prev7.toISOString().slice(0, 10))
      .lte("date", end.toISOString().slice(0, 10))
      .neq("page", "")
      .limit(50000);

    const recent = new Map<string, number>();
    const previous = new Map<string, number>();
    const last7Str = last7.toISOString().slice(0, 10);
    for (const r of rows || []) {
      if (r.date >= last7Str) recent.set(r.page, (recent.get(r.page) || 0) + r.clicks);
      else previous.set(r.page, (previous.get(r.page) || 0) + r.clicks);
    }

    type Drop = { page: string; previous: number; current: number; drop_pct: number };
    const drops: Drop[] = [];
    for (const [page, prev] of previous) {
      if (prev < MIN_PREV_CLICKS) continue;
      const cur = recent.get(page) || 0;
      const dropPct = (prev - cur) / prev;
      if (dropPct >= DROP_THRESHOLD) drops.push({ page, previous: prev, current: cur, drop_pct: Math.round(dropPct * 100) });
    }
    drops.sort((a, b) => b.drop_pct - a.drop_pct);

    // Competitor leapfrog: us going from <=3 to outside top 5 OR competitor moving to #1 from >3
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(); yesterday.setUTCDate(yesterday.getUTCDate() - 7);
    const yStr = yesterday.toISOString().slice(0, 10);
    const { data: ranksToday } = await sb.from("seo_competitor_rankings").select("*").eq("date", today);
    const { data: ranksPrev } = await sb.from("seo_competitor_rankings").select("*").gte("date", yStr).lt("date", today);
    const prevByKey = new Map<string, any>();
    for (const r of ranksPrev || []) prevByKey.set(`${r.query}|${r.domain}`, r);
    type Leap = { query: string; prev: number | null; current: number | null; reason: string };
    const leaps: Leap[] = [];
    for (const r of ranksToday || []) {
      const prev = prevByKey.get(`${r.query}|${r.domain}`);
      if (!prev) continue;
      if (r.is_us && prev.position && prev.position <= 3 && (!r.position || r.position > 5)) {
        leaps.push({ query: r.query, prev: prev.position, current: r.position, reason: "Am pierdut top 3" });
      }
      if (!r.is_us && r.position === 1 && (!prev.position || prev.position > 3)) {
        leaps.push({ query: r.query, prev: prev.position, current: 1, reason: `Competitor ${r.domain} a urcat pe poziția 1` });
      }
    }

    if (drops.length === 0 && leaps.length === 0) {
      return json({ success: true, alerts: 0 });
    }

    // Dedup
    const dedupSince = new Date(Date.now() - DEDUP_HOURS * 60 * 60 * 1000).toISOString();
    const { data: recentLog } = await sb.from("seo_anomaly_log").select("alert_key").gte("sent_at", dedupSince);
    const sentKeys = new Set((recentLog || []).map(r => r.alert_key));

    const newDrops = drops.filter(d => !sentKeys.has(`drop:${d.page}`));
    const newLeaps = leaps.filter(l => !sentKeys.has(`leap:${l.query}:${l.reason}`));

    if (newDrops.length === 0 && newLeaps.length === 0) {
      return json({ success: true, alerts: 0, deduped: drops.length + leaps.length });
    }

    const fmt = (n: number) => new Intl.NumberFormat("ro-RO").format(n);
    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:680px;margin:0 auto;background:#fff;color:#0f172a">
        <div style="background:linear-gradient(135deg,#7f1d1d,#b91c1c);padding:24px;color:#fff">
          <h1 style="margin:0;font-size:20px">⚠️ Alertă SEO</h1>
          <p style="margin:4px 0 0;opacity:.9;font-size:13px">${new Date().toLocaleString("ro-RO")}</p>
        </div>
        <div style="padding:24px">
          ${newDrops.length ? `<h2 style="font-size:15px;margin:0 0 8px">📉 Pagini cu scădere &gt;${Math.round(DROP_THRESHOLD*100)}% (7d)</h2>
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
            <tr><th style="padding:8px;text-align:left;background:#f3f4f6;font-size:12px">Pagină</th><th style="padding:8px;text-align:right;background:#f3f4f6;font-size:12px">Înainte</th><th style="padding:8px;text-align:right;background:#f3f4f6;font-size:12px">Acum</th><th style="padding:8px;text-align:right;background:#f3f4f6;font-size:12px">Drop</th></tr>
            ${newDrops.slice(0,15).map(d => `<tr><td style="padding:8px;border-bottom:1px solid #f1f5f9;font-size:12px"><a href="${d.page}" style="color:#1e3a5f">${d.page.replace(/^https?:\/\/[^/]+/,"")}</a></td><td style="padding:8px;text-align:right;border-bottom:1px solid #f1f5f9;font-size:12px">${fmt(d.previous)}</td><td style="padding:8px;text-align:right;border-bottom:1px solid #f1f5f9;font-size:12px">${fmt(d.current)}</td><td style="padding:8px;text-align:right;border-bottom:1px solid #f1f5f9;font-size:12px;color:#b91c1c;font-weight:600">-${d.drop_pct}%</td></tr>`).join("")}
          </table>` : ""}
          ${newLeaps.length ? `<h2 style="font-size:15px;margin:16px 0 8px">🥊 Competitor / poziție</h2>
          <ul style="font-size:13px;color:#1f2937;padding-left:18px">
            ${newLeaps.slice(0,15).map(l => `<li><b>${l.query}</b> — ${l.reason} (${l.prev || "—"} → ${l.current || "—"})</li>`).join("")}
          </ul>` : ""}
          <p style="margin-top:24px;font-size:12px;color:#6b7280">Sistemul de monitorizare automată SEO · <a href="https://realtrust.ro/admin" style="color:#1e3a5f">Deschide dashboard</a></p>
        </div>
      </div>`;

    const sendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM, to: [REPORT_EMAIL],
        subject: `⚠️ Alertă SEO · ${newDrops.length} drops, ${newLeaps.length} mișcări SERP`,
        html,
      }),
    });
    if (!sendRes.ok) {
      const t = await sendRes.text();
      console.error("resend fail", t);
      return json({ error: "resend_failed", details: t }, 502);
    }

    // Log dedup keys
    const logs = [
      ...newDrops.map(d => ({ alert_key: `drop:${d.page}`, payload: d })),
      ...newLeaps.map(l => ({ alert_key: `leap:${l.query}:${l.reason}`, payload: l })),
    ];
    await sb.from("seo_anomaly_log").insert(logs);

    return json({ success: true, alerts: logs.length, drops: newDrops.length, leaps: newLeaps.length });
  } catch (e) {
    console.error("seo-anomaly-alerts", e);
    return json({ error: (e as Error).message }, 500);
  }
});
