// Follows a redirect the way Googlebot would and decides whether it is "clean".
// Pure TypeScript with an injectable fetch (no Deno/Vite imports) — used by
// `seo-indexing-alerts` and `seo-alert-monitor`, unit-tested from src/lib.
//
// Handles HTTP 3xx and the site's HTML redirect documents
// (`<meta http-equiv="refresh" content="0; url=…">`, used for consolidated
// blog slugs and removed pages).

import { normalizeInspectionUrl } from "./gscIndexingClassification.ts";

/** A simple redirect: at most this many hops before the destination. */
export const MAX_CLEAN_REDIRECT_HOPS = 2;
/** Hard stop while following, so a loop or very long chain can't hang a run. */
const MAX_FOLLOW = 8;

export type RedirectProblem =
  | "no_redirect"
  | "loop"
  | "chain"
  | "destination_error"
  | "destination_noindex"
  | "destination_not_canonical"
  | "fetch_failed";

export interface RedirectCheck {
  clean: boolean;
  hops: number;
  finalUrl: string | null;
  finalStatus: number | null;
  problem?: RedirectProblem;
  /** Short Romanian explanation for e-mails and the admin table. */
  reason: string;
}

export type FetchLike = (url: string, init: { redirect: "manual"; headers: Record<string, string> }) => Promise<{
  status: number;
  headers: { get(name: string): string | null };
  text(): Promise<string>;
}>;

const attr = (tag: string, name: string) => {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i"));
  return m ? (m[2] ?? m[3] ?? "") : null;
};

function findTags(html: string, tagName: string): string[] {
  return html.match(new RegExp(`<${tagName}\\b[^>]*>`, "gi")) ?? [];
}

export function metaRefreshTarget(html: string, base: string): string | null {
  for (const tag of findTags(html, "meta")) {
    if ((attr(tag, "http-equiv") ?? "").toLowerCase() !== "refresh") continue;
    const content = attr(tag, "content") ?? "";
    const m = content.match(/url\s*=\s*['"]?([^'";]+)/i);
    if (!m) continue;
    try { return new URL(m[1].trim(), base).toString(); } catch { return null; }
  }
  return null;
}

export function canonicalHref(html: string, base: string): string | null {
  for (const tag of findTags(html, "link")) {
    const rel = (attr(tag, "rel") ?? "").toLowerCase().split(/\s+/);
    if (!rel.includes("canonical")) continue;
    const href = attr(tag, "href");
    if (!href) continue;
    try { return new URL(href, base).toString(); } catch { return null; }
  }
  return null;
}

export function hasNoindex(html: string, xRobotsTag: string | null): boolean {
  if (xRobotsTag && /noindex|none/i.test(xRobotsTag)) return true;
  for (const tag of findTags(html, "meta")) {
    const name = (attr(tag, "name") ?? "").toLowerCase();
    if (name !== "robots" && name !== "googlebot") continue;
    if (/noindex|none/i.test(attr(tag, "content") ?? "")) return true;
  }
  return false;
}

const result = (r: Omit<RedirectCheck, "clean">): RedirectCheck => ({ ...r, clean: !r.problem });

export async function traceRedirect(startUrl: string, fetchFn: FetchLike): Promise<RedirectCheck> {
  const seen = new Set<string>([normalizeInspectionUrl(startUrl)]);
  let current = startUrl;
  let hops = 0;

  for (let i = 0; i <= MAX_FOLLOW; i++) {
    let res: Awaited<ReturnType<FetchLike>>;
    try {
      res = await fetchFn(current, { redirect: "manual", headers: { "User-Agent": "RealTrustSEOMonitor/1.0 (+https://realtrust.ro)" } });
    } catch {
      return result({ hops, finalUrl: current, finalStatus: null, problem: "fetch_failed", reason: `Nu am putut deschide ${current}.` });
    }

    let next: string | null = null;
    let html = "";
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (loc) { try { next = new URL(loc, current).toString(); } catch { next = null; } }
    } else if (res.status >= 200 && res.status < 300) {
      html = await res.text().catch(() => "");
      const refresh = metaRefreshTarget(html, current);
      if (refresh && normalizeInspectionUrl(refresh) !== normalizeInspectionUrl(current)) next = refresh;
    }

    if (next) {
      hops++;
      const key = normalizeInspectionUrl(next);
      if (seen.has(key)) {
        return result({ hops, finalUrl: next, finalStatus: res.status, problem: "loop", reason: `Buclă de redirecționare (revine la ${next}).` });
      }
      seen.add(key);
      current = next;
      continue;
    }

    // `current` is the destination.
    if (hops === 0) {
      return result({ hops, finalUrl: current, finalStatus: res.status, problem: "no_redirect", reason: "Adresa nu mai redirecționează (verifică în Search Console)." });
    }
    if (hops > MAX_CLEAN_REDIRECT_HOPS) {
      return result({ hops, finalUrl: current, finalStatus: res.status, problem: "chain", reason: `Lanț de ${hops} redirecționări până la ${current}.` });
    }
    if (res.status < 200 || res.status >= 300) {
      return result({ hops, finalUrl: current, finalStatus: res.status, problem: "destination_error", reason: `Destinația ${current} răspunde cu eroare ${res.status}.` });
    }
    if (hasNoindex(html, res.headers.get("x-robots-tag"))) {
      return result({ hops, finalUrl: current, finalStatus: res.status, problem: "destination_noindex", reason: `Destinația ${current} este blocată de la indexare (noindex).` });
    }
    const canonical = canonicalHref(html, current);
    if (canonical && normalizeInspectionUrl(canonical) !== normalizeInspectionUrl(current)) {
      return result({ hops, finalUrl: current, finalStatus: res.status, problem: "destination_not_canonical", reason: `Destinația ${current} indică alt canonic (${canonical}).` });
    }
    return result({ hops, finalUrl: current, finalStatus: res.status, reason: `Redirecționează corect către ${current}.` });
  }

  return result({ hops, finalUrl: current, finalStatus: null, problem: "chain", reason: `Lanț de peste ${MAX_FOLLOW} redirecționări pornind de la ${startUrl}.` });
}
