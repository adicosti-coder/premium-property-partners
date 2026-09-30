// gsc-monthly-pages — trafic organic Google pe luni, pentru realtrust.ro în total
// și pentru fiecare pagină de cazare. Citește Search Console prin conectorul
// Lovable (gateway). Admin sau apel intern.
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";
const SITE_ENC = encodeURIComponent("https://realtrust.ro/");

const isoMonthsAgo = (m: number) => {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - m);
  return d.toISOString().slice(0, 10);
};

type Row = { keys: string[]; clicks: number; impressions: number; position: number };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const denied = await requireInternalOrAdmin(req, corsHeaders);
  if (denied) return denied;

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const GSC_API_KEY = Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY");
  if (!LOVABLE_API_KEY || !GSC_API_KEY) {
    return json({ error: "Google Search Console nu este conectat." }, 503);
  }

  const body = await req.json().catch(() => ({}));
  const months = [3, 6, 12].includes(Number(body?.months)) ? Number(body.months) : 6;

  try {
    const res = await fetch(`${GATEWAY}/webmasters/v3/sites/${SITE_ENC}/searchAnalytics/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": GSC_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate: isoMonthsAgo(months - 1),
        endDate: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10),
        dimensions: ["date", "page"],
        rowLimit: 25000,
      }),
    });

    const text = await res.text();
    if (!res.ok) {
      console.error(`gsc-monthly-pages gateway [${res.status}]: ${text}`);
      return json({ error: "Search Console a refuzat cererea", status: res.status, details: text }, res.status);
    }

    const rows: Row[] = (JSON.parse(text)?.rows ?? []) as Row[];
    const site: Record<string, { clicks: number; impressions: number }> = {};
    const pages: Record<string, Record<string, { clicks: number; impressions: number; position: number; n: number }>> = {};

    for (const r of rows) {
      const month = String(r.keys?.[0] ?? "").slice(0, 7);
      const url = String(r.keys?.[1] ?? "");
      if (!month || !url) continue;
      const path = (() => { try { return new URL(url).pathname; } catch { return url; } })();

      const s = (site[month] ||= { clicks: 0, impressions: 0 });
      s.clicks += r.clicks ?? 0;
      s.impressions += r.impressions ?? 0;

      const slug = /^\/cazare\/(.+)$/.exec(path)?.[1];
      if (!slug) continue;
      const p = (pages[slug] ||= {});
      const cell = (p[month] ||= { clicks: 0, impressions: 0, position: 0, n: 0 });
      cell.clicks += r.clicks ?? 0;
      cell.impressions += r.impressions ?? 0;
      cell.position += r.position ?? 0;
      cell.n += 1;
    }

    const monthsList = Object.keys(site).sort();
    const listings = Object.entries(pages).map(([slug, byMonth]) => ({
      slug,
      months: Object.fromEntries(
        Object.entries(byMonth).map(([m, c]) => [m, {
          clicks: Math.round(c.clicks),
          impressions: Math.round(c.impressions),
          position: c.n ? Math.round((c.position / c.n) * 10) / 10 : null,
        }]),
      ),
    })).sort((a, b) => a.slug.localeCompare(b.slug));

    return json({
      success: true,
      months: monthsList,
      site: Object.fromEntries(monthsList.map((m) => [m, { clicks: Math.round(site[m].clicks), impressions: Math.round(site[m].impressions) }])),
      listings,
    });
  } catch (e) {
    console.error("gsc-monthly-pages", e);
    return json({ error: "Nu am putut citi datele din Search Console" }, 500);
  }
});
