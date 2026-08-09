/**
 * indexnow-notify
 *
 * Notifică motoarele de căutare imediat ce apare/se modifică conținut indexabil:
 *  1. IndexNow (Bing + Yandex + Seznam) — ping direct pe api.indexnow.org
 *  2. Google Search Console — resubmit sitemap prin conectorul GSC
 *     (Google a retras endpoint-ul public /ping în 2023, deci singura cale
 *     validă rămâne Sitemaps API pe proprietatea verificată)
 *
 * Body:
 *   { urls: string[], triggered_by?: string, submit_sitemaps?: boolean }
 *
 * Este apelat de trigger-ele din DB (properties / blog_articles /
 * residential_complexes) și manual din Admin.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INDEXNOW_KEY = "97f850c0625c43878fbeb66c5a399858";
// Host canonic (non-www) — identic cu <link rel="canonical"> și cu sitemap-urile.
const HOST = "realtrust.ro";
const ORIGIN = `https://${HOST}`;
const KEY_LOCATION = `${ORIGIN}/${INDEXNOW_KEY}.txt`;

const SITEMAPS = [
  `${ORIGIN}/sitemap.xml`,
  `${ORIGIN}/sitemap-static.xml`,
  `${ORIGIN}/sitemap-dynamic.xml`,
];

const GSC_GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";

type SiteEntry = { siteUrl: string; permissionLevel?: string };

const coversHost = (siteUrl: string) => {
  if (siteUrl.startsWith("sc-domain:")) {
    const domain = siteUrl.slice("sc-domain:".length).toLowerCase();
    return HOST === domain || HOST.endsWith(`.${domain}`);
  }
  try {
    return new URL(siteUrl).hostname.toLowerCase() === HOST;
  } catch {
    return false;
  }
};

/** Resubmit sitemap-urile pe proprietatea GSC verificată. Nu blochează IndexNow. */
async function submitSitemapsToGsc(): Promise<Record<string, unknown>> {
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  const connectionApiKey = Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY");
  if (!lovableApiKey || !connectionApiKey) {
    return { skipped: "google_search_console_not_connected" };
  }

  const headers = {
    Authorization: `Bearer ${lovableApiKey}`,
    "X-Connection-Api-Key": connectionApiKey,
  };

  const listRes = await fetch(`${GSC_GATEWAY}/webmasters/v3/sites`, { headers });
  if (!listRes.ok) {
    const body = await listRes.text();
    console.error(`[indexnow] GSC sites list failed [${listRes.status}]: ${body}`);
    return { error: `sites_list_failed_${listRes.status}`, details: body.slice(0, 500) };
  }

  const { siteEntry = [] } = (await listRes.json()) as { siteEntry?: SiteEntry[] };
  const matches = siteEntry.filter(
    (e) => e.permissionLevel !== "siteUnverifiedUser" && coversHost(e.siteUrl),
  );

  if (matches.length === 0) return { skipped: "no_verified_property" };
  if (matches.length > 1) {
    return { skipped: "multiple_properties", candidates: matches.map((m) => m.siteUrl) };
  }

  const siteUrl = matches[0].siteUrl;
  const results: Record<string, number> = {};

  for (const sitemap of SITEMAPS) {
    const res = await fetch(
      `${GSC_GATEWAY}/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps/${encodeURIComponent(sitemap)}`,
      { method: "PUT", headers },
    );
    results[sitemap] = res.status;
    if (!res.ok) {
      console.error(`[indexnow] sitemap submit ${sitemap} failed [${res.status}]: ${await res.text()}`);
    }
  }

  return { siteUrl, sitemaps: results };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const logPings = async (
    fullUrls: string[],
    status: number | null,
    success: boolean,
    body: string,
    triggeredBy: string,
    error?: string,
  ) => {
    try {
      const rows = fullUrls.map((u) => ({
        url: u,
        host: HOST,
        http_status: status,
        success,
        response_body: body.slice(0, 1000),
        triggered_by: triggeredBy.slice(0, 100),
        batch_size: fullUrls.length,
        error: error ?? null,
      }));
      if (rows.length > 0) await supabase.from("indexnow_pings").insert(rows);
    } catch (e) {
      console.warn("[indexnow] failed to log pings:", (e as Error).message);
    }
  };

  try {
    const { urls, triggered_by, submit_sitemaps } = (await req.json()) as {
      urls?: string[];
      triggered_by?: string;
      submit_sitemaps?: boolean;
    };
    const trigger = triggered_by || "manual";

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return new Response(JSON.stringify({ error: "urls array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalizează pe host-ul canonic (acceptă și path-uri relative, și URL-uri www).
    const urlList = [
      ...new Set(
        urls
          .filter((u) => typeof u === "string" && u.length > 0)
          .slice(0, 10_000)
          .map((u) => (u.startsWith("http") ? u : `${ORIGIN}${u.startsWith("/") ? u : `/${u}`}`))
          .map((u) => u.replace("https://www.realtrust.ro", ORIGIN)),
      ),
    ];

    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: HOST, key: INDEXNOW_KEY, keyLocation: KEY_LOCATION, urlList }),
    });

    const status = response.status;
    const body = await response.text();
    const ok = status >= 200 && status < 300;

    await logPings(urlList, status, ok, body, trigger);

    // Sitemap resubmit către Google (implicit activ; poate fi dezactivat cu submit_sitemaps: false)
    let google: Record<string, unknown> = { skipped: "disabled_by_request" };
    if (submit_sitemaps !== false) {
      try {
        google = await submitSitemapsToGsc();
      } catch (e) {
        google = { error: (e as Error).message };
        console.error("[indexnow] GSC submit threw:", (e as Error).message);
      }
    }

    return new Response(
      JSON.stringify({ ok, status, body, count: urlList.length, google }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = String(err);
    console.error("[indexnow] fatal:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
