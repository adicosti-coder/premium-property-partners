import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";
const SITE = "https://realtrust.ro/";
const SITE_ENC = encodeURIComponent(SITE);
const ALERT_EMAIL = "adicosti@gmail.com";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GSC_API_KEY = Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY || !GSC_API_KEY) {
      return new Response(JSON.stringify({ error: "GSC nu este conectat" }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const headers = {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": GSC_API_KEY,
      "Content-Type": "application/json",
    };

    // Allow targeted inspection: { urls: [...] } overrides the GSC top-pages list.
    let pages: string[] = [];
    let mode: "auto" | "targeted" = "auto";
    try {
      if (req.method === "POST") {
        const body = await req.json().catch(() => ({}));
        if (Array.isArray(body?.urls) && body.urls.length > 0) {
          pages = body.urls.filter((u: any) => typeof u === "string" && u.startsWith("http")).slice(0, 25);
          mode = "targeted";
        }
      }
    } catch (_) { /* ignore */ }

    if (mode === "auto") {
      // Top 10 most-impressed pages from last 7 days
      const end = new Date(); end.setUTCDate(end.getUTCDate() - 2);
      const start = new Date(); start.setUTCDate(start.getUTCDate() - 9);
      const startDate = start.toISOString().slice(0, 10);
      const endDate = end.toISOString().slice(0, 10);

      const pagesRes = await fetch(
        `${GATEWAY}/webmasters/v3/sites/${SITE_ENC}/searchAnalytics/query`,
        { method: "POST", headers, body: JSON.stringify({ startDate, endDate, dimensions: ["page"], rowLimit: 10 }) },
      );
      const pagesJson = pagesRes.ok ? await pagesRes.json() : { rows: [] };
      pages = (pagesJson.rows || []).map((r: any) => r.keys[0]);
    }

    // URL Inspection for each
    const issues: Array<{ url: string; verdict: string; coverageState: string; lastCrawl?: string }> = [];
    for (const url of pages) {
      try {
        const r = await fetch(`${GATEWAY}/v1/urlInspection/index:inspect`, {
          method: "POST", headers,
          body: JSON.stringify({ inspectionUrl: url, siteUrl: SITE }),
        });
        if (!r.ok) continue;
        const j = await r.json();
        const ir = j?.inspectionResult?.indexStatusResult;
        if (!ir) continue;
        const verdict = ir.verdict || "";
        const coverage = ir.coverageState || "";
        // Critical = anything not PASS
        if (verdict !== "PASS") {
          issues.push({
            url,
            verdict,
            coverageState: coverage,
            lastCrawl: ir.lastCrawlTime,
          });
        }
      } catch (e) { console.error("inspect err", url, e); }
    }

    // Persist snapshot
    await supabase.from("seo_indexing_snapshots").insert({
      site: SITE,
      checked_pages: pages.length,
      issues_count: issues.length,
      issues: issues,
    });

    // Send alert if any critical issues + Resend configured
    if (issues.length > 0 && RESEND_API_KEY) {
      const html = `
        <h2>⚠️ Alertă SEO: ${issues.length} probleme de indexare detectate</h2>
        <p>Site: <strong>${SITE}</strong></p>
        <p>Pagini verificate: ${pages.length} | Probleme: <strong>${issues.length}</strong></p>
        <table border="1" cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;font-size:13px">
          <tr style="background:#f3f4f6"><th>URL</th><th>Verdict</th><th>Stare acoperire</th></tr>
          ${issues.map(i => `<tr><td><a href="${i.url}">${i.url}</a></td><td>${i.verdict}</td><td>${i.coverageState}</td></tr>`).join("")}
        </table>
        <p style="margin-top:16px;color:#6b7280">Verifică în <a href="https://search.google.com/search-console">Google Search Console</a>.</p>
      `;
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "RealTrust SEO <noreply@realtrust.ro>",
          to: [ALERT_EMAIL],
          subject: `[SEO Alert] ${issues.length} probleme indexare realtrust.ro`,
          html,
        }),
      });
    }

    return new Response(
      JSON.stringify({ success: true, checked: pages.length, issues: issues.length, details: issues }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("seo-indexing-alerts error:", e);
    return new Response(JSON.stringify({ error: e?.message || "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
