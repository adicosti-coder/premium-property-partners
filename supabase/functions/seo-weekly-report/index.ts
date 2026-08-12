import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/adminAuth.ts";
import { isInternalCall } from "../_shared/cronAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";
const SITE = "https://realtrust.ro/";
const SITE_ENC = encodeURIComponent(SITE);
const REPORT_EMAIL = "adicosti@gmail.com";

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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY || !GSC_API_KEY) {
      return new Response(JSON.stringify({ error: "GSC nu este conectat" }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const headers = {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": GSC_API_KEY,
      "Content-Type": "application/json",
    };

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

    // Send via centralized transactional email pipeline (Lovable Emails)
    const { error: sendErr } = await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "seo-weekly-report",
        recipientEmail: REPORT_EMAIL,
        idempotencyKey: `seo-weekly-report-${startDate}-${endDate}`,
        templateData: { startDate, endDate, summary, leadsTotal, conversionRate, queryRows, pageRows },
      },
    });

    if (sendErr) {
      console.error("send-transactional-email error:", sendErr);
      return new Response(JSON.stringify({ error: "email_dispatch_failed", details: String(sendErr) }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, summary, leadsTotal, conversionRate, sent_to: REPORT_EMAIL }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("seo-weekly-report error:", e);
    return new Response(JSON.stringify({ error: e?.message || "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
