// Pure helpers for the SEO auditor — kept free of Deno APIs so they are unit-tested.

const HIDDEN_HEADING_RE = /aria-hidden=["']?true|\bhidden(\s|=|>)|sr-only|visually-hidden|display\s*:\s*none|visibility\s*:\s*hidden/i;
const PRERENDER_TITLE_RE = /data-prerender-title/i;

const openTag = (tag: string) => tag.match(/<h[1-6]\b[^>]*>/i)?.[0] || "";

/**
 * Counts the headings a crawler gets for the page.
 * Hidden headings never count. The prerender block's `data-prerender-title`
 * heading is the static copy of the React H1 (React removes the block on
 * mount), so it counts as the page H1 only when no other H1 exists, and it is
 * never counted as an H2 (on the homepage it is demoted to H2 under the hero H1).
 */
export function countPageHeadings(html: string): { h1Count: number; h2Count: number } {
  const allH1 = html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi) || [];
  const allH2 = html.match(/<h2\b[^>]*>[\s\S]*?<\/h2>/gi) || [];
  const visibleH1 = allH1.filter((t) => !HIDDEN_HEADING_RE.test(openTag(t)));
  const realH1 = visibleH1.filter((t) => !PRERENDER_TITLE_RE.test(openTag(t)));
  const prerenderH1 = visibleH1.length - realH1.length;
  const h1Count = realH1.length > 0 ? realH1.length : Math.min(prerenderH1, 1);
  const h2Count = allH2.filter((t) => {
    const open = openTag(t);
    return !HIDDEN_HEADING_RE.test(open) && !PRERENDER_TITLE_RE.test(open);
  }).length;
  return { h1Count, h2Count };
}

export interface ActiveOverride {
  title?: string | null;
  meta_description?: string | null;
  extra_keywords?: unknown;
  applied_at?: string | null;
  updated_at?: string | null;
}

export interface OverrideApplication {
  applied: boolean;
  title: boolean;
  meta: boolean;
  keywords: string[];
  static_title: string;
  static_meta: string;
  changed_at: string | null;
}

const clean = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "");

/**
 * The live site applies the active `seo_overrides` row on the client, so the
 * audit scores the override title/meta instead of the static fallback that a
 * plain HTML fetch returns.
 */
export function applyActiveOverride<T extends { title?: string; metaDescription?: string }>(
  scraped: T,
  override: ActiveOverride | null | undefined,
): { scraped: T; override: OverrideApplication } {
  const staticTitle = clean(scraped.title);
  const staticMeta = clean(scraped.metaDescription);
  const title = clean(override?.title);
  const meta = clean(override?.meta_description);
  const keywords = Array.isArray(override?.extra_keywords)
    ? (override!.extra_keywords as any[])
        .map((k) => clean(typeof k === "string" ? k : k?.keyword))
        .filter(Boolean)
        .slice(0, 12)
    : [];
  const info: OverrideApplication = {
    applied: !!(title || meta || keywords.length),
    title: !!title,
    meta: !!meta,
    keywords,
    static_title: staticTitle,
    static_meta: staticMeta,
    changed_at: override?.updated_at || override?.applied_at || null,
  };
  if (!info.applied) return { scraped, override: info };
  return {
    scraped: {
      ...scraped,
      title: title || scraped.title,
      metaDescription: meta || scraped.metaDescription,
    },
    override: info,
  };
}

/** A cached AI analysis is stale once the page's override changed after it. */
export function overrideNewerThan(override: OverrideApplication, analysisCreatedAt: string | null | undefined): boolean {
  if (!override.applied || !override.changed_at || !analysisCreatedAt) return false;
  return new Date(override.changed_at).getTime() > new Date(analysisCreatedAt).getTime();
}

export function overridePromptNote(override: OverrideApplication): string {
  if (!override.applied) return "";
  const parts = [
    "=== OVERRIDE SEO ACTIV (aplicat pe site din panoul admin) ===",
    override.title ? `Titlul de mai sus vine din override (titlul static din cod: "${override.static_title}").` : "",
    override.meta ? `Meta description de mai sus vine din override (meta statică: "${override.static_meta}").` : "",
    override.keywords.length ? `Keyword-uri deja aplicate prin override: ${override.keywords.join(", ")}. NU le resugera.` : "",
    "Evaluează pagina cu aceste valori — NU raporta ca problemă titlul/meta static înlocuit de override.",
  ];
  return parts.filter(Boolean).join("\n");
}
