// Deterministic post-processing for AI-optimized blog articles:
// strips SEO labels, keeps only internal links that exist on the site,
// and appends exactly one RealTrust / ApArt Hotel CTA block.

export const CTA_MARKER = "<!-- realtrust-cta -->";

export const CTA_BLOCK = `${CTA_MARKER}
## Vrei ca apartamentul tău să lucreze pentru tine?

RealTrust și ApArt Hotel administrează apartamente în Timișoara, în regim hotelier sau prin închiriere pe termen lung. Ne ocupăm de fotografii, anunțuri, oaspeți, curățenie și raportare lunară, pentru un comision de 15–20% din venituri.

- [Află cum funcționează administrarea](/pentru-proprietari)
- [Calculează-ți venitul estimat](/investitii)`;

export const STATIC_INTERNAL_PATHS = [
  "/pentru-proprietari", "/investitii", "/cazare", "/ansambluri-rezidentiale",
  "/cartiere", "/servicii-imobiliare", "/blog", "/intrebari-frecvente", "/despre-noi", "/anunturi",
];

const LABEL_RE = /^\s*\**\s*(meta\s*descriere|meta\s*description|cuvinte\s*cheie|keywords|meta\s*title)\s*:?.*$/gim;

/** Keep internal links only when their path is allowed; unknown ones become plain text. */
export function filterInternalLinks(md: string, allowed: Set<string>): string {
  return md.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (full, text: string, href: string) => {
    if (/^https?:\/\//i.test(href)) {
      try {
        const u = new URL(href);
        if (!/(^|\.)realtrust\.ro$/i.test(u.hostname)) return full; // external link: keep
        href = u.pathname;
      } catch { return text; }
    }
    const path = href.split(/[?#]/)[0].replace(/\/$/, "") || "/";
    return allowed.has(path) ? `[${text}](${path})` : text;
  });
}

export function countInternalLinks(md: string): number {
  return (md.match(/\]\(\/[^)]*\)/g) || []).length;
}

/** Removes any previous CTA and appends a single fresh one at the end. */
export function polishArticle(md: string, allowed: Set<string>): string {
  let out = md.replace(LABEL_RE, "");
  const idx = out.indexOf(CTA_MARKER);
  if (idx >= 0) out = out.slice(0, idx);
  out = filterInternalLinks(out, allowed);
  out = out.replace(/^# (.+)$/gm, "## $1"); // page already renders the H1
  out = out.replace(/\n{3,}/g, "\n\n").trim();
  return `${out}\n\n${CTA_BLOCK}\n`;
}
