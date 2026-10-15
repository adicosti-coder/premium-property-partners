// Firecrawl = doar rezervă secundară, limitată la cota gratuită lunară (1.500 credite).
// `firecrawlFetch` înlocuiește `fetch` pentru apelurile Firecrawl: rezervă creditele estimate
// atomic în DB, iar când bugetul e epuizat (sau Firecrawl răspunde 402) întoarce un răspuns
// 402 sintetic, fără apel extern — apelanții tratează deja `!resp.ok` ca eșec și continuă.
// `directScrape` este scraperul intern (fără credite) folosit înainte de Firecrawl.
import { createClient } from "npm:@supabase/supabase-js@2";

// deno-lint-ignore no-explicit-any
let sbClient: any = null;
const sb = (): any => sbClient ??= createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

export function estimateFirecrawlCredits(path: string, body: Record<string, unknown>): number {
  if (/\/search$/.test(path)) {
    const limit = Number(body.limit) || 5;
    const scrapes = body.scrapeOptions ? limit : 0;
    return Math.ceil(limit / 10) * 2 + scrapes;
  }
  if (/\/map$/.test(path)) return 1;
  let c = 1;
  if (body.proxy === "stealth") c += 4;
  const formats = Array.isArray(body.formats) ? body.formats : [];
  if (body.jsonOptions || formats.some((f) => f === "json" || (f as { type?: string })?.type === "json")) c += 4;
  return c;
}

const budgetResponse = (reason: string) =>
  new Response(JSON.stringify({ success: false, error: reason, budget_exhausted: true }), {
    status: 402, headers: { "Content-Type": "application/json" },
  });

/** Drop-in pentru fetch către api.firecrawl.dev; respectă bugetul lunar și modul gateway. */
export async function firecrawlFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const path = new URL(url).pathname;
  let body: Record<string, unknown> = {};
  try { body = JSON.parse(String(init.body ?? "{}")); } catch { /* ignore */ }
  const est = estimateFirecrawlCredits(path, body);

  try {
    const { data: ok, error } = await sb().rpc("firecrawl_reserve_credits", { _credits: est });
    if (error) console.warn(JSON.stringify({ kind: "firecrawl_budget_rpc_error", message: error.message }));
    else if (!ok) {
      console.warn(JSON.stringify({ kind: "firecrawl_budget_exhausted", path, est }));
      return budgetResponse("Cota lunară Firecrawl (1.500 credite) a fost atinsă — se folosesc doar Apify și scraperul intern.");
    }
  } catch (e) {
    console.warn(JSON.stringify({ kind: "firecrawl_budget_error", message: (e as Error).message }));
  }

  // Cheile lovc_ merg prin gateway; cheile fc- direct.
  const key = Deno.env.get("FIRECRAWL_API_KEY") || "";
  const headers = new Headers(init.headers);
  let target = url;
  if (key.startsWith("lovc_")) {
    target = url.replace("https://api.firecrawl.dev", "https://connector-gateway.lovable.dev/firecrawl");
    headers.set("Authorization", `Bearer ${Deno.env.get("LOVABLE_API_KEY") ?? ""}`);
    headers.set("X-Connection-Api-Key", key);
  }

  let resp: Response;
  try {
    resp = await fetch(target, { ...init, headers });
  } catch (e) {
    await sb().rpc("firecrawl_adjust_credits", { _delta: -est, _exhausted: false }).then(() => {}, () => {});
    throw e;
  }
  if (resp.status === 402 || resp.status === 403 && /credit/i.test(await resp.clone().text().catch(() => ""))) {
    await sb().rpc("firecrawl_adjust_credits", { _delta: -est, _exhausted: true }).then(() => {}, () => {});
    return budgetResponse("Creditele Firecrawl sunt epuizate — se folosesc doar Apify și scraperul intern.");
  }
  if (!resp.ok) {
    await sb().rpc("firecrawl_adjust_credits", { _delta: -est, _exhausted: false }).then(() => {}, () => {});
    return resp;
  }
  // Corectează cu creditele reale raportate de Firecrawl, când există.
  resp.clone().json().then(async (j) => {
    const actual = Number(j?.creditsUsed ?? j?.data?.metadata?.creditsUsed);
    if (Number.isFinite(actual) && actual !== est) {
      await sb().rpc("firecrawl_adjust_credits", { _delta: actual - est, _exhausted: false });
    }
  }).catch(() => {});
  return resp;
}

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

function htmlToMarkdownLite(html: string): string {
  return html
    .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, "")
    .replace(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi, "\n![]($1)\n")
    .replace(/<\/(p|div|li|h[1-6]|br|section)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n\n").trim();
}

/**
 * Scraper intern (gratuit): citește direct pagina și întoarce un răspuns în formatul Firecrawl
 * ({ data: { markdown, html, rawHtml, links, metadata } }) sau null dacă pagina e blocată/goală.
 */
export async function directScrape(url: string, timeoutMs = 12000): Promise<Record<string, unknown> | null> {
  try {
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,*/*;q=0.8", "Accept-Language": "ro-RO,ro;q=0.9,en;q=0.8" },
    });
    if (!resp.ok) return null;
    const html = await resp.text();
    if (html.length < 2000 || /captcha|cf-challenge|Access Denied/i.test(html.slice(0, 5000))) return null;
    const meta = (p: string) => html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${p}["'][^>]+content=["']([^"']*)`, "i"))?.[1];
    const links = [...new Set([...html.matchAll(/(?:href|src)=["'](https?:\/\/[^"']+)["']/gi)].map((m) => m[1]))];
    return {
      success: true,
      via: "direct",
      data: {
        html, rawHtml: html, markdown: htmlToMarkdownLite(html), links,
        metadata: {
          title: html.match(/<title[^>]*>([^<]*)/i)?.[1]?.trim(),
          description: meta("description") ?? meta("og:description"),
          ogImage: meta("og:image"), ogTitle: meta("og:title"), sourceURL: url, statusCode: 200,
        },
      },
    };
  } catch {
    return null;
  }
}
