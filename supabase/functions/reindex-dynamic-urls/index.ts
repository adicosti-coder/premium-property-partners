/**
 * reindex-dynamic-urls
 *
 * Bulk re-indexing pentru TOATE URL-urile dinamice (proprietăți, complexe,
 * articole blog, articole comunitate) exact cum apar în sitemap-dynamic.xml.
 *
 * Flux:
 *   1. Construiește sitemap-ul dinamic (aceeași sursă ca /sitemap-dynamic.xml)
 *      și extrage <loc>-urile.
 *   2. Canonicalizează: doar https + apex realtrust.ro, fără query/fragment,
 *      fără trailing slash. Orice altceva este eliminat.
 *   3. Trimite batch-uri (max 10.000 URL/cerere) către https://api.indexnow.org
 *      → Bing / Yandex / Seznam. Fiecare batch e logat în `indexnow_pings`.
 *   4. Resubmite sitemap-urile către Google Search Console (Sitemaps API,
 *      singura cale validă după retragerea endpoint-ului public /ping).
 *
 * Auth: cron/service-role intern (x-cron-secret / x-webhook-secret) sau admin.
 * Body opțional: { dry_run?: boolean, triggered_by?: string, submit_google?: boolean }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireAdmin } from "../_shared/adminAuth.ts";
import { isInternalCall } from "../_shared/cronAuth.ts";
import { buildDynamicSitemap, BASE_URL } from "../_shared/sitemapBuilder.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret, x-webhook-secret",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const HOST = "realtrust.ro";
const INDEXNOW_KEY = "97f850c0625c43878fbeb66c5a399858";
const KEY_LOCATION = `${BASE_URL}/${INDEXNOW_KEY}.txt`;
const BATCH_SIZE = 10_000;

const SITEMAPS = [
  `${BASE_URL}/sitemap.xml`,
  `${BASE_URL}/sitemap-static.xml`,
  `${BASE_URL}/sitemap-dynamic.xml`,
];

const GSC_GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";
const PREFERRED_SITE_URL = `sc-domain:${HOST}`;

type SiteEntry = { siteUrl: string; permissionLevel?: string };

/** https + apex host, fără parametri/fragment/trailing slash. null = respins. */
const canonicalize = (raw: string): string | null => {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host !== HOST) return null;
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (path === "/") return null; // doar URL-uri dinamice
  return `${BASE_URL}${path}`;
};

const coversHost = (siteUrl: string) => {
  if (siteUrl.startsWith("sc-domain:")) {
    const domain = siteUrl.slice("sc-domain:".length).toLowerCase();
    return HOST === domain || HOST.endsWith(`.${domain}`);
  }
  try {
    return new URL(siteUrl).hostname.toLowerCase().replace(/^www\./, "") === HOST;
  } catch {
    return false;
  }
};

async function submitSitemapsToGsc(): Promise<Record<string, unknown>> {
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  const connectionApiKey = Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY");
  if (!lovableApiKey || !connectionApiKey) return { skipped: "google_search_console_not_connected" };

  const headers = {
    Authorization: `Bearer ${lovableApiKey}`,
    "X-Connection-Api-Key": connectionApiKey,
  };

  const listRes = await fetch(`${GSC_GATEWAY}/webmasters/v3/sites`, { headers });
  if (!listRes.ok) {
    const body = await listRes.text();
    console.error(`[reindex] GSC sites list failed [${listRes.status}]`);
    return { error: `sites_list_failed_${listRes.status}`, details: body.slice(0, 300) };
  }

  const { siteEntry = [] } = (await listRes.json()) as { siteEntry?: SiteEntry[] };
  const matches = siteEntry.filter(
    (e) => e.permissionLevel !== "siteUnverifiedUser" && coversHost(e.siteUrl),
  );
  if (matches.length === 0) return { skipped: "no_verified_property" };

  const siteUrl = matches.find((m) => m.siteUrl === PREFERRED_SITE_URL)?.siteUrl ?? matches[0].siteUrl;
  const results: Record<string, number> = {};
  for (const sitemap of SITEMAPS) {
    const res = await fetch(
      `${GSC_GATEWAY}/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps/${encodeURIComponent(sitemap)}`,
      { method: "PUT", headers },
    );
    results[sitemap] = res.status;
  }
  return { siteUrl, sitemaps: results };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (!(await isInternalCall(req))) {
    const auth = await requireAdmin(req, corsHeaders);
    if (!auth.ok) return auth.response!;
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  let body: { dry_run?: boolean; triggered_by?: string; submit_google?: boolean } = {};
  try {
    body = await req.json();
  } catch { /* GET / empty body */ }
  const triggeredBy = (body.triggered_by || "reindex-dynamic-urls").slice(0, 100);

  try {
    // 1. Sursa: fie URL-urile explicite primite (reindexare din alerte SEO),
    //    fie sitemap-ul dinamic complet.
    let urlList: string[];
    if (Array.isArray(body.urls) && body.urls.length > 0) {
      urlList = [
        ...new Set(
          body.urls
            .slice(0, 500)
            .filter((u): u is string => typeof u === "string")
            .map(canonicalize)
            .filter((u): u is string => Boolean(u)),
        ),
      ];
    } else {
      const xml = await buildDynamicSitemap(supabase);
      const locs = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1]);
      urlList = [...new Set(locs.map(canonicalize).filter((u): u is string => Boolean(u)))];
    }

    if (urlList.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: "no_dynamic_urls" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    if (body.dry_run) {
      return new Response(
        JSON.stringify({ ok: true, dry_run: true, count: urlList.length, sample: urlList.slice(0, 10) }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Batch-uri IndexNow (max 10.000 URL/cerere conform specificației)
    const batches: { size: number; status: number; ok: boolean; body: string }[] = [];
    for (let i = 0; i < urlList.length; i += BATCH_SIZE) {
      const chunk = urlList.slice(i, i + BATCH_SIZE);
      let status = 0;
      let resBody = "";
      let ok = false;
      try {
        const res = await fetch("https://api.indexnow.org/indexnow", {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({ host: HOST, key: INDEXNOW_KEY, keyLocation: KEY_LOCATION, urlList: chunk }),
        });
        status = res.status;
        resBody = await res.text();
        ok = status >= 200 && status < 300;
      } catch (e) {
        resBody = String(e);
      }
      batches.push({ size: chunk.length, status, ok, body: resBody.slice(0, 300) });

      // Audit trail per URL
      try {
        await supabase.from("indexnow_pings").insert(
          chunk.map((u) => ({
            url: u,
            host: HOST,
            http_status: status || null,
            success: ok,
            response_body: resBody.slice(0, 1000),
            triggered_by: triggeredBy,
            batch_size: chunk.length,
            error: ok ? null : resBody.slice(0, 500) || "indexnow_failed",
          })),
        );
      } catch (e) {
        console.warn("[reindex] log insert failed:", (e as Error).message);
      }
    }

    // 3. Google Search Console — resubmit sitemap-uri
    let google: Record<string, unknown> = { skipped: "disabled_by_request" };
    if (body.submit_google !== false) {
      try {
        google = await submitSitemapsToGsc();
      } catch (e) {
        google = { error: (e as Error).message };
      }
    }

    const allOk = batches.every((b) => b.ok);
    return new Response(
      JSON.stringify({ ok: allOk, count: urlList.length, batches, google }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[reindex] fatal:", String(err));
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
