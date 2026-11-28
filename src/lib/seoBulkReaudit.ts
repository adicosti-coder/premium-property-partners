/** Re-audit în lot pentru panoul SEO: selecția paginilor slabe și filtrul grilei. */
export const LOW_SCORE_THRESHOLD = 70;

export const auditPathOf = (url: string) => {
  try { return new URL(url).pathname.replace(/\/+$/, "") || "/"; } catch { return url; }
};

/** Paginile urmărite cu ultimul scor sub prag; cele fără niciun audit nu intră. Ordonate de la cel mai slab. */
export function lowScoreTargets(urls: string[], scores: Map<string, number>, threshold = LOW_SCORE_THRESHOLD): string[] {
  return urls
    .filter((u) => { const s = scores.get(auditPathOf(u)); return typeof s === "number" && s < threshold; })
    .sort((a, b) => (scores.get(auditPathOf(a)) ?? 0) - (scores.get(auditPathOf(b)) ?? 0));
}

export type TrackedGridFilter = "all" | "weak";

export function filterTrackedUrls(urls: string[], scores: Map<string, number>, mode: TrackedGridFilter, threshold = LOW_SCORE_THRESHOLD) {
  return mode === "weak" ? lowScoreTargets(urls, scores, threshold) : urls;
}
