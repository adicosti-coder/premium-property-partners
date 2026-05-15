import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";
const SITE = "https://realtrust.ro/";
const SITE_ENC = encodeURIComponent(SITE);
const REPORT_EMAIL = "adicosti@gmail.com";
const FROM = "RealTrust SEO <info@notify.realtrust.ro>";

const fmt = (n: number) => new Intl.NumberFormat("ro-RO").format(Math.round(n));
const isoDaysAgo = (d: number) => {
  const dt = new Date();
  dt.setUTCDate(dt.getUTCDate() - d);
  return dt.toISOString().slice(0, 10);
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GSC_API_KEY = Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY || !GSC_API_KEY) {
      return new Response(JSON.stringify({ error: "GSC nu este conectat" }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY lipsă" }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const headers = {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": GSC_API_KEY,
      "Content-Type": "application/json",
    };

    // Previous week (GSC has ~2-day lag → window: 9..2 days ago)
    const startDate = isoDaysAgo(9);
    const endDate = isoDaysAgo(2);
    const queryEndpoint = `${GATEWAY}/webmasters/v3/sites/${SITE_ENC}/searchAnalytics/query`;

    const [totalsRes, queriesRes, pagesRes] = await Promise.all([
      fetch(queryEndpoint, { method: "POST", headers, body: JSON.stringify({ startDate, endDate, rowLimit: 1 }) }),
      fetch(queryEndpoint, { method: "POST", headers, body: JSON.stringify({ startDate, endDate, dimensions: ["query"], rowLimit: 10 }) }),
      fetch(queryEndpoint, { method: "POST", headers, body: JSON.stringify({ startDate, endDate, dimensions: ["page"], rowLimit: 10 }) }),
    ]);
    const totals = totalsRes.ok ? await totalsRes.json() : { rows: [] };
    const queries = queriesRes.ok ? await queriesRes.json() : { rows: [] };
    const pages = pagesRes.ok ? await pagesRes.json() : { rows: [] };

    const t = (totals.rows && totals.rows[0]) || {};
    const summary = {
      clicks: t.clicks || 0,
      impressions: t.impressions || 0,
      ctr: Number(((t.ctr || 0) * 100).toFixed(2)),
      position: Number((t.position || 0).toFixed(1)),
    };

    // Leads in same window
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { count: leadsCount } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .gte("created_at", `${startDate}T00:00:00Z`)
      .lte("created_at", `${endDate}T23:59:59Z`);
    const leadsTotal = leadsCount || 0;
    const conversionRate = summary.clicks > 0 ? Number(((leadsTotal / summary.clicks) * 100).toFixed(2)) : 0;

    const queryRows = (queries.rows || []).map((r: any) => ({
      query: r.keys[0], clicks: r.clicks || 0, impressions: r.impressions || 0,
      ctr: Number(((r.ctr || 0) * 100).toFixed(2)), position: Number((r.position || 0).toFixed(1)),
    }));
    const pageRows = (pages.rows || []).map((r: any) => ({
      page: r.keys[0], clicks: r.clicks || 0,
      ctr: Number(((r.ctr || 0) * 100).toFixed(2)), position: Number((r.position || 0).toFixed(1)),
    }));

    const cellTh = "padding:8px 10px;text-align:left;background:#f3f4f6;border-bottom:2px solid #e5e7eb;font-size:12px;color:#374151";
    const cellTd = "padding:8px 10px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#1f2937";

    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:680px;margin:0 auto;background:#ffffff;color:#0f172a">
        <div style="background:linear-gradient(135deg,#0f1b3d,#1e3a5f);padding:24px;color:#fff">
          <h1 style="margin:0;font-size:20px">📈 Raport SEO săptămânal</h1>
          <p style="margin:4px 0 0;opacity:.85;font-size:13px">${startDate} → ${endDate} · realtrust.ro</p>
        </div>
        <div style="padding:24px">
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:20px">
            <div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px"><div style="font-size:11px;color:#6b7280">Clickuri</div><div style="font-size:22px;font-weight:700">${fmt(summary.clicks)}</div></div>
            <div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px"><div style="font-size:11px;color:#6b7280">Impresii</div><div style="font-size:22px;font-weight:700">${fmt(summary.impressions)}</div></div>
            <div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px"><div style="font-size:11px;color:#6b7280">CTR mediu</div><div style="font-size:22px;font-weight:700">${summary.ctr}%</div></div>
            <div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px"><div style="font-size:11px;color:#6b7280">Poziție medie</div><div style="font-size:22px;font-weight:700">${summary.position}</div></div>
          </div>

          <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:14px 16px;margin-bottom:20px">
            <div style="font-size:12px;color:#92400e;margin-bottom:4px">Conversie SEO → Lead-uri</div>
            <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px">
              <div style="font-size:13px;color:#78350f">${fmt(leadsTotal)} lead-uri din ${fmt(summary.clicks)} clickuri Google</div>
              <div style="font-size:24px;font-weight:700;color:#c2410c">${conversionRate}%</div>
            </div>
          </div>

          <h2 style="font-size:15px;margin:24px 0 8px">🔎 Top 10 căutări</h2>
          <table style="width:100%;border-collapse:collapse"><tr><th style="${cellTh}">Query</th><th style="${cellTh}">Clk</th><th style="${cellTh}">CTR</th><th style="${cellTh}">Poz.</th></tr>
          ${queryRows.map(q => `<tr><td style="${cellTd}">${q.query}</td><td style="${cellTd}">${fmt(q.clicks)}</td><td style="${cellTd}">${q.ctr}%</td><td style="${cellTd}">${q.position}</td></tr>`).join("")}
          </table>

          <h2 style="font-size:15px;margin:24px 0 8px">📄 Top 10 pagini</h2>
          <table style="width:100%;border-collapse:collapse"><tr><th style="${cellTh}">Pagină</th><th style="${cellTh}">Clk</th><th style="${cellTh}">CTR</th></tr>
          ${pageRows.map(p => `<tr><td style="${cellTd}"><a href="${p.page}" style="color:#1e3a5f">${p.page.replace(/^https?:\/\/[^/]+/, "")}</a></td><td style="${cellTd}">${fmt(p.clicks)}</td><td style="${cellTd}">${p.ctr}%</td></tr>`).join("")}
          </table>

          <p style="margin-top:24px;font-size:12px;color:#6b7280">Generat automat luni dimineața · <a href="https://realtrust.ro/admin" style="color:#1e3a5f">Deschide dashboard</a></p>
        </div>
      </div>`;

    const sendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [REPORT_EMAIL],
        subject: `📈 Raport SEO săptămânal · ${fmt(summary.clicks)} clickuri · ${conversionRate}% conv.`,
        html,
      }),
    });
    const sendJson = await sendRes.json().catch(() => ({}));
    if (!sendRes.ok) {
      console.error("Resend error:", sendJson);
      return new Response(JSON.stringify({ error: "resend_failed", details: sendJson }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, summary, leadsTotal, conversionRate, sent_to: REPORT_EMAIL }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("seo-weekly-report error:", e);
    return new Response(JSON.stringify({ error: e?.message || "unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
