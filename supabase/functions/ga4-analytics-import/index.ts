// GA4 Analytics Import — fetches last 30 days of pagePath data via GA4 Data API
// Authenticates with a Google service account (GOOGLE_SERVICE_ACCOUNT_KEY) and
// upserts results into `seo_ga4_metrics` keyed by (url_path, period_start).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// --- helpers -----------------------------------------------------------------
const pemToArrayBuffer = (pem: string): ArrayBuffer => {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
};

const importPrivateKey = async (pem: string): Promise<CryptoKey> => {
  return await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(pem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
};

const getAccessToken = async (saKey: any): Promise<string> => {
  const key = await importPrivateKey(saKey.private_key);
  const jwt = await create(
    { alg: "RS256", typ: "JWT" },
    {
      iss: saKey.client_email,
      scope: "https://www.googleapis.com/auth/analytics.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: getNumericDate(0),
      exp: getNumericDate(3600),
    },
    key,
  );
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(`OAuth error: ${JSON.stringify(data)}`);
  return data.access_token as string;
};

// Normalize a GA4 pagePath to our canonical url_path
const normalizePath = (raw: string): string => {
  if (!raw) return "/";
  let p = raw.split("?")[0].split("#")[0];
  if (!p.startsWith("/")) p = "/" + p;
  p = p.replace(/\/{2,}/g, "/");
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p || "/";
};

// --- main --------------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SA_RAW = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");
    const PROPERTY_ID = Deno.env.get("GA4_PROPERTY_ID");
    if (!SA_RAW) return json(500, { error: "Missing GOOGLE_SERVICE_ACCOUNT_KEY" });
    if (!PROPERTY_ID) return json(500, { error: "Missing GA4_PROPERTY_ID" });

    let saKey: any;
    try {
      saKey = JSON.parse(SA_RAW);
    } catch {
      return json(500, { error: "GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON" });
    }
    if (!saKey.client_email || !saKey.private_key) {
      return json(500, { error: "Service account JSON missing client_email/private_key" });
    }

    // Optional payload override (days, conversion event name)
    let payload: any = {};
    try { payload = await req.json(); } catch { /* ignore */ }
    const days = Math.max(1, Math.min(365, Number(payload?.days) || 30));
    const conversionEvent = String(payload?.conversion_event || "generate_lead");

    const accessToken = await getAccessToken(saKey);

    // Build date range for last `days` (inclusive of today)
    const endDate = "today";
    const startDate = `${days}daysAgo`;

    const runReport = async (body: any) => {
      const r = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:runReport`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );
      const j = await r.json();
      if (!r.ok) throw new Error(`GA4 API: ${JSON.stringify(j)}`);
      return j;
    };

    // Sessions + engagement_rate per pagePath
    const sessionsReport = await runReport({
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "pagePath" }],
      metrics: [
        { name: "sessions" },
        { name: "engagementRate" },
      ],
      limit: 10000,
    });

    // Conversions per pagePath (filtered to a specific event name)
    const conversionsReport = await runReport({
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "pagePath" }],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: {
        filter: {
          fieldName: "eventName",
          stringFilter: { matchType: "EXACT", value: conversionEvent },
        },
      },
      limit: 10000,
    });

    // Aggregate by normalized url_path
    type Agg = { sessions: number; engagement_rate_sum: number; sessions_for_engagement: number; conversions: number };
    const agg = new Map<string, Agg>();

    for (const row of sessionsReport.rows ?? []) {
      const path = normalizePath(row.dimensionValues?.[0]?.value ?? "/");
      const sessions = Number(row.metricValues?.[0]?.value ?? 0);
      const engagement = Number(row.metricValues?.[1]?.value ?? 0);
      const cur = agg.get(path) ?? { sessions: 0, engagement_rate_sum: 0, sessions_for_engagement: 0, conversions: 0 };
      cur.sessions += sessions;
      // session-weighted engagement rate
      cur.engagement_rate_sum += engagement * sessions;
      cur.sessions_for_engagement += sessions;
      agg.set(path, cur);
    }

    for (const row of conversionsReport.rows ?? []) {
      const path = normalizePath(row.dimensionValues?.[0]?.value ?? "/");
      const conv = Number(row.metricValues?.[0]?.value ?? 0);
      const cur = agg.get(path) ?? { sessions: 0, engagement_rate_sum: 0, sessions_for_engagement: 0, conversions: 0 };
      cur.conversions += conv;
      agg.set(path, cur);
    }

    // Period_start = today - days (start of window)
    const period = new Date();
    period.setUTCDate(period.getUTCDate() - days);
    const periodStr = period.toISOString().slice(0, 10);

    const rows = Array.from(agg.entries())
      .filter(([, v]) => v.sessions > 0 || v.conversions > 0)
      .map(([url_path, v]) => ({
        url_path,
        sessions: Math.round(v.sessions),
        conversions: Math.round(v.conversions),
        engagement_rate: v.sessions_for_engagement > 0
          ? Math.round((v.engagement_rate_sum / v.sessions_for_engagement) * 10000) / 10000
          : 0,
        period_start: periodStr,
      }));

    if (rows.length === 0) {
      return json(200, { ok: true, imported: 0, message: "No GA4 rows returned" });
    }

    // Upsert into seo_ga4_metrics
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error } = await supabase
      .from("seo_ga4_metrics")
      .upsert(rows, { onConflict: "url_path,period_start" });

    if (error) return json(500, { error: `DB upsert: ${error.message}` });

    return json(200, {
      ok: true,
      imported: rows.length,
      period_start: periodStr,
      days,
      conversion_event: conversionEvent,
    });
  } catch (e: any) {
    console.error("ga4-analytics-import error:", e);
    return json(500, { error: e?.message || String(e) });
  }
});
